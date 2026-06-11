# Audit de durcissement — 2026-06-11

Périmètre : pipeline-orchestrator (moteur actif), _shared/*, analyze-fund / due-diligence
(legacy mais branchés à l'UI), config déployée (projet Supabase `anxyjsgrittdwrizqcgi`).

---

## 1. Carte du système

### Entrées (surface d'attaque)
| Endpoint | verify_jwt (déployé) | Auth applicative | Appelants |
|---|---|---|---|
| pipeline-orchestrator | true | aucune (actions start/continue/status/sweep ouvertes à tout porteur d'anon key) | front (start/status), self (continue, service-role), cron pg_cron (sweep, anon key) |
| analyze-fund | **false** | aucune | front Analyse.tsx (bouton principal "Lancer l'analyse") |
| due-diligence | **false** | aucune | front DueDiligenceResult.tsx, orchestrator (service-role) |
| ai-qa | true | — | front AIQAChat.tsx |
| ninja-sourcing | true | aucune | **aucun appelant** |
| advanced-sourcing | false | authenticatedHandler + deductAPICall | **aucun appelant** |
| analyze-company, quick-worker | true | — | orphelins déployés, absents du repo |
| search-thesis, create-checkout-session | non déployés | — | repo uniquement |

### États / orchestration
- `pipeline_jobs` : machine à états (thesis_analyzing → … → dd_done/error), self-invocation
  `fireContinue` + `EdgeRuntime.waitUntil`, watchdog `selfHealIfStuck` (déclenché par poll
  `status` toutes les 3 s ET par cron sweep toutes les minutes), retries bornés par `max_retries`.
- `due_diligence_jobs` : 2 phases (search → analyze), réutilisé par l'orchestrateur (steps 4-5).
- `search_cache` : SHA-256(count|query), TTL 14 j — utilisé par analyze-fund et due-diligence,
  **pas par le pipeline-orchestrator** (search-client.ts ne le lit pas).
- `user_sourced_companies` : mémoire anti-resourcing par utilisateur.

### Appels externes
Serper + Brave (les DEUX par requête dans searchAll), INSEE Sirene, HN Algolia, GitHub,
Gemini (rotation 3 clés), Vertex (token statique `VERTEX_AI_TOKEN` — jamais configuré),
Groq (modèle décommissionné), DigitalOcean Agent (optionnel).

### Secrets
Tous via Deno.env. Clé Gemini passée **en query string d'URL** (ai-client.ts:90,
due-diligence/index.ts:434). Anon key embarquée dans la commande pg_cron (rôle anon : OK).

### RLS
- `pipeline_jobs`, `due_diligence_jobs`, `sourcing_jobs`, `search_cache` : RLS activé,
  zéro policy permissive (deny-all → accès service-role uniquement). Correct.
- `user_sourced_companies` : select-own uniquement. Correct.
- Le rôle `anon`/`authenticated` garde un grant SELECT (schéma GraphQL discoverable) mais
  la RLS bloque les lignes — exposition de méta-schéma seulement (advisor WARN, faible).
- Quota d'essai : **purement client-side** (localStorage, useTrial.ts) ; `decrement_trial_credits`
  n'est appelé que par des fonctions sans appelant (advanced-sourcing, search-thesis).

---

## 2. Rapport priorisé

### CRITIQUE

**C1 — `analyze-fund` et `due-diligence` invocables sans AUCUNE clé**
- Preuve : config déployée `verify_jwt:false` (API Supabase) ; aucun contrôle d'auth dans le code
  (due-diligence/index.ts:268-318, analyze-fund/index.ts serve()).
- Impact : n'importe qui sur Internet (curl, pas besoin de l'anon key, CORS inopérant hors
  navigateur) déclenche ~44 requêtes Serper×20 résultats + 3-4 appels Gemini par call.
  Épuisement des quotas (2500 Serper/mois) en quelques minutes ; déni de service économique.
- Correctif : activer `verify_jwt` (tous les appelants existants envoient déjà un JWT valide :
  anon key, session token ou service-role) + le figer dans `config.toml`.

**C2 — `pipeline-orchestrator` : `continue` appelable par tout porteur d'anon key + aucune limite sur `start`**
- Preuve : index.ts:901-934 — aucun contrôle d'identité par action. `fireContinue` (l.84) envoie
  le service-role, mais le handler ne le vérifie pas. `handleStart` (l.633) ne vérifie ni crédit
  ni nombre de jobs.
- Impact : (a) `action:"continue"` spammé sur un pipelineId → exécutions concurrentes de la même
  étape (88 requêtes web + IA rejouées N fois, races sur updateJob) ; (b) `action:"start"` en
  boucle → coût illimité (l'anon key est publique par design).
- Correctif : `continue` réservé au service-role ; claim optimiste (status+updated_at) dans
  handleContinue ; bump de retry conditionnel dans le watchdog (anti double-fire poll+cron) ;
  plafond de jobs actifs (3/user, 10 anonymes globaux) sur `start`.

### ÉLEVÉ

**E1 — Double exécution watchdog : poll `status` (3 s) × cron sweep (60 s)**
- Preuve : selfHealIfStuck (l.773-803) lit retry_count puis update sans condition → deux
  appels concurrents passent tous deux le seuil et déclenchent chacun un fireContinue.
- Impact : étape rejouée en double (coût ×2, écritures concurrentes sur le job).
- Correctif : `update ... eq(retry_count, retry)` + ne firer que si la ligne a été modifiée
  (inclus dans C2).

**E2 — Le pipeline ne profite PAS du cache de recherche et appelle Brave ET Serper pour chaque requête**
- Preuve : search-client.ts:124-143 (`searchAll` = braveSearch + serperSearch systématiques,
  aucun import de search-cache.ts) ; ~88 requêtes/run (orchestrator l.317-336) → ~176 calls
  API par run, 0 réutilisation entre runs.
- Impact : ~2 runs suffisent à épuiser le quota Brave mensuel ; latence inutile.
- Correctif (comportement préservé) : brancher getCachedSearch/setCachedSearch sur searchAll
  (mêmes résultats, servis depuis Postgres). Option non appliquée (changerait les résultats) :
  passer en Serper primaire → Brave fallback comme documenté §5 de HOW_IT_WORKS.

**E3 — Retry `dd_analyze` non idempotent → run marqué error alors que le rapport existe**
- Preuve : due-diligence/index.ts:505-510 renvoie 400 "Ce job a déjà été analysé" ;
  orchestrator handleDDAnalyze (l.567-612) traite tout !ok comme erreur → retries → error.
- Impact : si l'orchestrateur meurt entre la fin de l'analyse DD et l'écriture de final_result,
  toutes les relances échouent définitivement (job error, crédit/quota consommés pour rien).
- Correctif : sur 400 "déjà analysé", lire `due_diligence_jobs.result` et terminer le job.

### MOYEN

**M1 — Clé Gemini en query string** (ai-client.ts:90, due-diligence/index.ts:434)
- Les URLs partent dans les logs d'erreurs fetch/proxies. Correctif : header `x-goog-api-key`.

**M2 — Injection dans la requête Sirene** (insee-sirene.ts:100-105)
- `nameTokens` (générés par l'IA) concaténés dans le q Lucene sans échappement ; un token avec
  `"` ou `)` casse la requête (résultat vide silencieux). Correctif : filtrer sur [a-z0-9].
- Les requêtes Serper/Brave construites par concat (fund_name, secteurs) ne sont QUE des chaînes
  de recherche : pas de surface d'injection exécutable. RAS au-delà du bruit.

**M3 — Sweep sans index adapté**
- Preuve : sweep filtre `status not in (…) AND updated_at < cutoff` (l.815-820) ; seul
  idx_pipeline_jobs_status existe. Correctif : index partiel
  `(updated_at) WHERE status NOT IN ('dd_done','error')` + `order by updated_at`.

**M4 — Fallbacks IA morts dans ai-client.ts**
- callVertex (l.117-127) exige `VERTEX_AI_TOKEN` (secret jamais documenté/configuré ; le reste du
  projet utilise VERTEX_AI_CREDENTIALS + JWT signé) et modèle `gemini-1.5-flash` retiré par Google.
- callGroq (l.31) : `llama-3.1-70b-versatile` décommissionné par Groq.
- Impact : la "chaîne de fallback" n'a en réalité qu'un maillon (Gemini + rotation de clés).
  Non corrigé ici (nécessite secrets/choix produit) — voir §4.

**M5 — Code mort**
- `search-thesis/` : non déployé, aucun appelant.
- `ninja-sourcing/` : déployé, aucun appelant front/back.
- `advanced-sourcing/` : déployé, aucun appelant front/back.
- `_shared/search-api-client.ts` : importé uniquement par les deux ci-dessus.
- Déployés orphelins hors repo : `analyze-company`, `quick-worker` (à supprimer côté dashboard).
- `analyze-fund` n'est PAS mort : c'est le bouton principal "Lancer l'analyse" (Analyser.tsx:111
  → /analyse → analyze-fund). Conservé.
- `config.toml` : project_id obsolète (`uziptoizdbazdxgjqunp` ≠ projet actif).

### FAIBLE

**F1 — `status` expose le job à quiconque connaît l'UUID** (capability URL). Accepté : UUID v4
non énumérable ; un contrôle d'ownership casserait le polling anonyme. Non modifié.
**F2 — Quota d'essai contournable** (localStorage). Vrai durcissement = exiger login + crédits
server-side sur start/analyze-fund/due-diligence : décision produit, non appliquée (voir §4).
**F3 — `handle_new_user()` SECURITY DEFINER exécutable par anon** (advisor). Trigger d'init de
profil ; à restreindre (`REVOKE EXECUTE`) — laissé en recommandation car hors périmètre pipeline.
**F4 — Biais popularité** : dedup-ranker plafonne les mentions (min(15)), blocklist annuaires,
bonus cross-signal — pas de biais "toujours les mêmes" détecté ; la mémoire user_sourced_companies
écarte les répétitions par utilisateur. RAS.
**F5 — Exclusions de thèse** : appliquées aux requêtes (negStr), au filtre ICP (filterByICP),
au cleanup d'entités et aux prompts de scoring (thesisFit≤20). Chaîne cohérente. RAS.

---

## 3. Correctifs appliqués (un commit par item)

1. `fix(security)`: verify_jwt activé sur analyze-fund + due-diligence, config.toml mis à jour (C1)
2. `fix(security)`: orchestrateur — continue réservé au service-role, claim optimiste,
   bump retry conditionnel, plafond de jobs actifs (C2+E1)
3. `perf(sourcing)`: cache search_cache branché sur searchAll (E2)
4. `fix(robustesse)`: récupération du rapport DD si le job est déjà analyze_done (E3)
5. `fix(security)`: clé Gemini en header + sanitisation des nameTokens INSEE (M1+M2)
6. `perf(db)`: index partiel pour le sweep (M3)
7. `chore`: suppression search-thesis, ninja-sourcing, advanced-sourcing, search-api-client (M5)

## 4. Non touché (et pourquoi)

- **Bascule Serper-primaire/Brave-fallback dans searchAll** : changerait la composition des
  résultats de sourcing (moins de diversité par requête). Gain ~50 % d'appels — à valider.
- **Fallbacks Vertex/Groq d'ai-client** : réparer Vertex = porter l'auth JWT signée (secrets à
  configurer) ; Groq = choisir un modèle actuel. Sans clé configurée, aucun effet aujourd'hui.
- **Quota server-side sur start/analyze-fund/due-diligence** : exige un login obligatoire ou un
  fingerprinting — décision produit (le trial localStorage devient sinon le seul garde-fou).
- **Afficher final_result du pipeline au lieu de RE-jouer la DD** : PipelineProgress.goToDD relance
  une due-diligence complète (~30 recherches + 3 IA) alors que le job contient déjà final_result.
  Économie majeure mais nécessite un refacto front (DueDiligenceResult accepte un rapport préchargé).
- **Suppression des fonctions déployées orphelines** (analyze-company, quick-worker, ninja-sourcing,
  advanced-sourcing côté Supabase) : pas d'API MCP de suppression — à faire au dashboard.
- **handle_new_user / leaked password protection / pg_net dans public** (advisors) : hors
  périmètre pipeline, à traiter dans une passe dédiée auth/infra.
- **analyze-fund (1200+ lignes, legacy)** : toujours branché au bouton principal de l'UI — aucun
  refactor de masse ; seuls verify_jwt et (déjà présent) le cache le concernent ici.
