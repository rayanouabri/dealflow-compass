# Comment fonctionne AI-VC

Documentation pratique du pipeline réel (vérifié end-to-end). Mise à jour : 2026-05-30.

> Pour la vision produit / roadmap, voir [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md).
> Pour le déploiement, voir [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).
> Pour la liste des secrets, voir [SECRETS_CONFIGURATION.md](./SECRETS_CONFIGURATION.md).

---

## 1. Vue d'ensemble

L'outil est un SaaS pour fonds VC qui automatise deux choses :

1. **Sourcing** : trouver une startup à analyser à partir d'une thèse d'investissement.
2. **Due Diligence** : générer un rapport complet sur une startup.

```
                   ┌────────────────────────────────────────────┐
                   │  Frontend React (Vercel)                   │
                   │  ai-vc-sourcing.vercel.app                 │
                   └────────────────┬───────────────────────────┘
                                    │ HTTPS + JWT
                   ┌────────────────▼───────────────────────────┐
                   │  Supabase Edge Functions (Deno)            │
                   │  analyze-fund · due-diligence ·            │
                   │  advanced-sourcing · ai-qa · ninja-sourcing│
                   └─┬──────────────────────────────────────┬───┘
                     │                                      │
            ┌────────▼─────────┐                ┌───────────▼──────────┐
            │ Postgres (RLS)   │                │  Fournisseurs externes│
            │ sourcing_jobs    │                │  Serper / Brave       │
            │ due_diligence_…  │                │  Vertex AI / Gemini   │
            │ search_cache     │                │  DigitalOcean Agent   │
            └──────────────────┘                └───────────────────────┘
```

---

## 2. Le parcours utilisateur

### Parcours A — Sourcing (`/analyse`)
1. L'utilisateur entre un nom de fonds (ou une thèse personnalisée).
2. Le frontend ([Analyse.tsx](src/pages/Analyse.tsx)) appelle `analyze-fund` en **4 phases séquentielles** (découpage pour éviter le timeout 150s de Supabase).
3. À la fin, navigation automatique vers `/due-diligence/result` avec la startup sélectionnée.

### Parcours B — Due Diligence (`/due-diligence`)
1. L'utilisateur entre un nom d'entreprise (manuellement, ou arrive depuis le sourcing).
2. Le frontend appelle `due-diligence` en **2 phases** (`search` puis `analyze`).
3. Affichage du rapport sur `/due-diligence/result`.

---

## 2-bis. Sourcing v2 : `pipeline-orchestrator` (ACTIF)

C'est le moteur de sourcing **réellement utilisé** par `/analyse` ([Analyser.tsx](src/pages/Analyser.tsx) + [PipelineProgress.tsx](src/pages/PipelineProgress.tsx)). Le pipeline `analyze-fund` (section 3) est l'ancien path. Tout l'état est dans la table `pipeline_jobs`.

### Orchestration : machine à états auto-chaînée
Une seule Edge Function ([pipeline-orchestrator](supabase/functions/pipeline-orchestrator/index.ts)) gère 5 étapes. Chaque étape, en fin de traitement, se ré-appelle elle-même (`action:"continue"`) pour lancer la suivante — découpage nécessaire pour ne pas dépasser le wall-time Supabase.

Actions : `start` (crée le job) · `continue` (exécute l'étape courante selon `status`) · `status` (lecture + watchdog) · `sweep` (balayage cron).

**Robustesse (3 niveaux)** :
1. `EdgeRuntime.waitUntil()` garde l'isolate vivant le temps que la requête de chaînage parte réellement (sinon l'isolate est tué avant l'envoi → job figé). C'est le correctif racine.
2. **Watchdog** (`selfHealIfStuck`) : sur chaque poll `status`, si un job dépasse le seuil de son étape sans bouger, il est relancé (`retry_count++`), borné par `max_retries` puis passé en `error`.
3. **Cron** (`pg_cron` + `pg_net`, toutes les minutes) appelle `sweep` → relance les jobs figés même si personne ne regarde la page.

### Étape 1 — Analyse de thèse → ICP
1 appel IA ([thesis-analysis.ts](supabase/functions/_shared/prompts/thesis-analysis.ts)) transforme le nom de fonds / la thèse en JSON structuré, dont un **Ideal Company Profile** : `definition`, `businessModel`, `mustHaveKeywords`, `exclusionKeywords`, `nafCodes`, `inseeNameTokens`. C'est ce qui rend le sourcing strict.

### Étape 2 — Sourcing multi-source (gratuit, parallèle)
| Source | Fichier | Nature |
|--------|---------|--------|
| Web FR-biaisé, ciblé ICP + exclusions | [sourcing-queries-fr.ts](supabase/functions/_shared/sourcing-queries-fr.ts) | Serper/Brave (~63 req) |
| INSEE Sirene (browse NAF + **nom-ciblé** sur tokens thèse) | [insee-sirene.ts](supabase/functions/_shared/insee-sirene.ts) | registre FR, gratuit |
| Hacker News (Show HN) | [hn-algolia.ts](supabase/functions/_shared/hn-algolia.ts) | gratuit, sans clé |
| GitHub (si thèse tech) | [github-search.ts](supabase/functions/_shared/github-search.ts) | `GITHUB_TOKEN` |

Puis **dedup + ranking** ([dedup-ranker.ts](supabase/functions/_shared/dedup-ranker.ts)) : regroupement par chemin complet pour les agrégateurs, blocklist d'annuaires/presse, filtre anti-titre-d'article, filtre ICP strict (exclut les acteurs hors-profil, boost on-thesis).

Enfin **résolution d'entités IA** ([entity-cleanup.ts](supabase/functions/_shared/entity-cleanup.ts)) : 1 appel qui filtre le bruit (comptes perso, repos sans société, labos), normalise les noms, dédoublonne, note la pertinence. Fallback = candidats bruts.

### Étape 3 — Picking
1 appel IA **batché** ([scoring-engine.ts](supabase/functions/_shared/scoring-engine.ts) `buildBatchScoringPrompt`) score les 6 meilleurs candidats d'un coup (8 dimensions pondérées) au lieu d'un appel par candidat. Fallback unitaire sur le top 3 si le batch échoue.

### Étapes 4-5 — Due Diligence
Délègue à la fonction `due-diligence` (phases `search` puis `analyze`, cf. section 4).

**Coût IA par run** : 1 (thèse) + 1 (cleanup) + 1 (picking batché) + DD. **Sources structurées = 0 crédit Serper.**

---

## 3. Sourcing : pipeline `analyze-fund` (4 phases) — LEGACY

Tout l'état est stocké dans la table `sourcing_jobs`. Chaque phase lit le job, écrit son résultat dans `search_context` (JSONB), met à jour `status`.

### Phase 1 — `search_fund`
**Rôle** : comprendre le fonds (thèse, portfolio existant, équipe).
- 3 recherches web :
  - `"{fund} investment thesis criteria sectors stage geography ticket size"` (12 résultats)
  - `"{fund} portfolio companies investments 2023 2024 2025"` (12 résultats)
  - `"{fund} team partners investors"` (6 résultats)
- Extraction par regex des noms d'entreprises du portfolio (mots-clés "invested in", "backed by"…).
- Écrit `{ fundThesisContext, fundSources, portfolioCompanies, status: "fund_done" }`.

**Coût** : 3 recherches, 0 IA.

### Phase 2 — `search_market`
**Rôle** : enrichir avec données marché (TAM/SAM/tendances).
- `enrichMarketData(sector, geography)` → 2-3 recherches : market size, trends, reports.
- Écrit `{ marketContext, marketSources, status: "market_done" }`.

**Coût** : 2-3 recherches, 0 IA.

### Phase 3 — `search_startups`
**Rôle** : collecter le maximum de signaux pour trouver des startups candidates. C'est la phase la plus lourde.

Découpage des recherches en couches successives :

| Couche | Requêtes | Conditionnement |
|--------|----------|-----------------|
| Base sourcing | 8-9 (resultsX par funding/emerging/founders/produit/traction) | toujours |
| Deep generic | 3 (news/concurrents/profils) | **uniquement si < 40 résultats uniques** (gating) |
| IP & innovation | 3-6 (brevets, spin-offs universitaires) | toujours, +3 si early-stage |
| Signaux précoces (incubateurs, talent, spin-offs, concours) | 15 | **uniquement si stade = pre-seed/seed** |
| Signaux faibles (8 catégories : GitHub, arXiv/HAL, Pappers, ProductHunt, Wellfound, Show HN, job boards, conférences) | 6-12 | filtrés par stade ; 1 ou 2 requêtes/catégorie selon abondance |
| Reflection AI | 1 appel IA + 3 recherches | uniquement si < 60 résultats |

À côté du moteur Brave/Serper :
- **DigitalOcean Agent** (si `USE_DO_AGENT=true`) : un agent IA gère le sourcing en autonomie via `callDigitalOceanAgent()`.
- **Extraction IA des critères** (1 appel) : si `fundThesisContext` est riche mais que les params (`stage`, `geography`, `startupSector`) sont absents/auto, l'IA les extrait de la thèse.

Tout est dédupliqué par URL, puis assemblé dans `startupSearchContext`.

**Coût (à froid, secteur courant)** : ~25-35 recherches + 1-2 IA. Avec cache rempli : descend à ~5-15 recherches.

### Phase 4 — `pick`
**Rôle** : choisir LA startup la plus pertinente.
- L'IA reçoit le `startupSearchContext` + la thèse + la liste noire du portfolio.
- Prompt court (< 8000 chars de contexte) demandant un JSON `{name, website, description}`.
- **Logique de fallback** :
  1. Essaie Vertex AI si `AI_PROVIDER=vertex` et credentials OK.
  2. Bascule Gemini → Vertex sur 429/403.
  3. Si **tous** les fournisseurs IA échouent → extraction manuelle scoring (favorise les pages d'accueil vs articles, exclut domaines presse/réseaux sociaux).

**Coût** : 1 appel IA (ou 0 en repli heuristique).

**Sortie** : `{ startup: { name, website, description } }` → le frontend navigue vers la DD.

---

## 4. Due Diligence : pipeline `due-diligence` (2 phases)

Stocké dans `due_diligence_jobs`. Architecture en 2 phases pour rester sous le timeout 150s.

### Phase `search`
- **~25 requêtes web** ciblées sur l'entreprise, batchées 3 en parallèle (délai 650ms) :
  - Équipe (founders/CEO/CTO/headcount) ×5-6
  - Produit/tech (features/stack/patents) ×3-4
  - Marché/concurrents (TAM/SAM/competitive) ×4
  - Presse/news ×3
  - Profils (LinkedIn/Crunchbase/Dealroom) ×3
  - Risques/reviews ×3
  - Récompenses ×2
- Si `companyWebsite` fourni : 2 requêtes `site:` supplémentaires.
- Si `additionalContext` fourni : 1 requête contextuelle.
- **Écrit `search_context` dans la table** et passe `status: "search_done"`.

**Coût** : ~28 recherches, 0 IA.

### Phase `analyze`
1. **Gap analysis 1** : 1 appel IA qui identifie les sections manquantes (équipe, IP, marché, métriques…) → génère jusqu'à 14 requêtes de complément en parallèle.
2. **Analyse principale** : 1 appel IA volumineux (jusqu'à 16k tokens output) qui génère le rapport JSON complet.
3. **Gap analysis 2** (si budget temps < 90s écoulé) : 1 appel IA qui identifie les sections faibles du rapport + jusqu'à 10 requêtes de complément + 1 appel IA d'enrichissement.
4. Retourne le JSON final.

**Coût** : ~10-25 recherches + 3-4 IA selon les gaps.

Le frontend ([DueDiligenceResult.tsx](src/pages/DueDiligenceResult.tsx)) a un **retry loop** (2 tentatives) sur 546/network errors car cette phase reste la plus susceptible de timeout.

---

## 5. Le moteur de recherche web

### Chaîne de repli (analyze-fund + due-diligence)
```
braveSearch(query, count)
  → cache hit ? retourne directement (0 crédit)
  → Serper.dev (primaire — Google, 2500/mois gratuits)
       → si 0 résultat (out of credits, rate-limited…) → bascule Brave
  → Brave Search (secondaire — 2000/mois gratuits, 1 req/sec)
  → sinon : retourne []
```

### Cache (`search_cache` table)
- **Clé** : SHA-256(`count|query.toLowerCase()`) → 64 chars.
- **TTL** : 14 jours (configurable via `setCachedSearch`).
- **Ne cache jamais un résultat vide** (évite d'empoisonner sur panne transitoire).
- Upsert via `Prefer: resolution=merge-duplicates`.
- Helper partagé : [_shared/search-cache.ts](supabase/functions/_shared/search-cache.ts).

### Gating (search_startups)
| Garde | Seuil | Effet |
|-------|-------|-------|
| Skip "deep queries" (3 requêtes génériques) | ≥ 40 résultats uniques | −3 recherches |
| Réduire signaux faibles à 1 query/catégorie au lieu de 2 | ≥ 60 résultats uniques | −6 recherches |
| Skip reflection AI | ≥ 60 résultats uniques | −1 IA −3 recherches |

Aucune perte de qualité : on ne coupe que quand les données sont déjà abondantes.

---

## 6. Les fournisseurs d'IA

Variable d'env `AI_PROVIDER` = `vertex` | `gemini`.

### Vertex AI (recommandé en prod)
- Auth : Service Account JSON dans `VERTEX_AI_CREDENTIALS`.
- Token OAuth signé localement (JWT RS256 → `oauth2.googleapis.com/token`).
- URL : `{location}-aiplatform.googleapis.com/v1/projects/{proj}/locations/{loc}/publishers/google/models/{model}:generateContent`.
- **Nécessite la facturation activée** sur le projet GCP (sinon → 403).
- Variables : `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL`, `VERTEX_AI_CREDENTIALS`.

### Gemini API direct
- Auth : clé API simple en query string.
- Tier gratuit : 1500 req/jour (Flash) ou 50 req/jour (Pro) → souvent saturé.
- Variables : `GEMINI_API_KEY` (ou `GEMINI_KEY_2`), `GEMINI_MODEL`.

### Logique de bascule (phase pick et autres)
1. Respecte `AI_PROVIDER` si configuré et fonctionnel.
2. Sinon prend ce qui est disponible.
3. Sur 429/403 de Gemini → bascule automatique vers Vertex au sein de la même requête.
4. Si tout est down → fallback heuristique (uniquement pour la phase pick).

---

## 7. Modèle de données (tables clés)

```sql
-- État d'un sourcing en cours (orchestration 4-phases)
sourcing_jobs (
  id uuid PK, fund_name text, custom_thesis jsonb, params jsonb,
  search_context jsonb,            -- accumule fundContext/marketContext/startupSearchContext
  search_results_count int,
  status text,                     -- 'fund_done' | 'market_done' | 'search_done' | 'error'
  error_message text, created_at, updated_at
)

-- État d'une DD en cours (orchestration 2-phases)
due_diligence_jobs (similar)

-- Cache des recherches web (toutes fonctions confondues)
search_cache (
  query_hash text PK,              -- SHA-256(count|query)
  query text, result_count int, results jsonb,
  created_at, expires_at           -- 14 jours par défaut
)

-- Profils utilisateurs + crédits + Stripe
user_profiles (
  id uuid PK (= auth.users.id),
  trial_credits_remaining int, subscription_tier text, subscription_status text,
  stripe_customer_id, stripe_subscription_id, subscription_ends_at
)

-- Trail des appels API par utilisateur (compteur quotas)
api_usage (user_id, function_name, usage_date, call_count)

-- Audit Stripe webhooks
stripe_events (id, event_id, type, data, processed_at)
```

RLS activé partout. `search_cache` n'a pas de policies publiques (accès via service role uniquement depuis les Edge Functions).

---

## 8. Sécurité

- **Auth** : JWT Supabase, vérifié sur la plupart des Edge Functions (sauf `due-diligence` et `advanced-sourcing` qui ont `verify_jwt: false` pour des raisons historiques — à corriger).
- **Anon key seulement côté client** (jamais le service role).
- **CORS** : whitelist explicite (`ai-vc-sourcing.vercel.app` + localhost dev).
- **Secrets** : tous dans Supabase Functions Secrets, jamais dans le code.
- **Trial credits** : décompte server-side avec `decrement_trial_credits(user_id)` (fonction Postgres atomique).

---

## 9. Comment tester / debugger

### Health check rapide (sans frontend)
```bash
# Token = clé anon (publique)
API="<VITE_SUPABASE_PUBLISHABLE_KEY>"
BASE="https://<project>.supabase.co/functions/v1"

# 1) sourcing
curl -X POST "$BASE/analyze-fund" -H "Content-Type: application/json" -H "apikey: $API" \
  -d '{"phase":"search_fund","fundName":"Partech","customThesis":{"sectors":["fintech"],"stage":"seed","geography":"France"}}'
# → renvoie {"jobId":"..."}
# Puis enchaîner search_market, search_startups, pick avec le même jobId.
```

### Inspecter un job qui a échoué
```sql
SELECT id, status, error_message, search_results_count,
       length(search_context->>'startupSearchContext') AS ctx_len
FROM sourcing_jobs ORDER BY created_at DESC LIMIT 5;
```
- `ctx_len = 0` et `search_results_count = 0` → Serper et Brave en panne. Vérifier les clés API.
- `status = 'error'` → lire `error_message`.

### Inspecter le cache
```sql
SELECT count(*) AS rows, sum(result_count) AS results,
       min(created_at), max(expires_at) FROM search_cache;
```

### Logs Edge Functions
Dashboard Supabase → Functions → [function] → Logs.
Ou via MCP : `get_logs(project_id, service: "edge-function")`.

### Erreurs fréquentes
| Symptôme | Cause | Fix |
|----------|-------|-----|
| Pick renvoie une startup qui est en fait un article de blog | IA en panne → heuristique active | Activer la facturation Vertex (cf. ci-dessous) |
| `IA indisponible (429)` côté frontend | Gemini quota dépassé | Le code bascule auto sur Vertex si configuré, sinon retourne en heuristique |
| `Contexte de sourcing vide` (400) | Aucun résultat de recherche collecté | Vérifier `BRAVE_API_KEY` (Serper peut être à zéro, Brave doit prendre le relais) |
| `Configuration Vertex AI invalide` | `VERTEX_AI_PROJECT_ID` ou `VERTEX_AI_CREDENTIALS` manquant | Vérifier les secrets Supabase |
| Pipeline figé > 150s | Timeout Supabase | Phase trop lourde — diminuer `RESULTS_PER_QUERY` ou activer cache |

---

## 10. État actuel & ce qu'il reste à faire

### ✅ Fonctionnel
- Pipeline 4-phases sourcing (vérifié end-to-end ~83s à froid, ~10s à chaud avec cache).
- Pipeline 2-phases DD.
- Cache recherche (gain mesuré : 7.8s → 3.1s sur fund search, 0 crédit consommé à chaud).
- Repli Serper → Brave (corrigé sur les deux fonctions).
- Repli IA Gemini → Vertex sur 429/403.
- Repli heuristique (scoring homepage vs article) quand toute IA est down.

### ⚠️ Bloqueurs externes (action utilisateur requise)
**Aucun fournisseur IA actif** au moment de la rédaction :
- Gemini API : `429 quota exceeded` (tier gratuit saturé).
- Vertex AI : `403 billing not enabled` sur projet `vc-final-485700`.

→ **Activer la facturation sur** https://console.developers.google.com/billing/enable?project=vc-final-485700
→ Le code bascule automatiquement sur Vertex dès que c'est actif — aucune modification nécessaire.

Sans IA, la phase `pick` retombe sur l'heuristique qui peut sélectionner des pages de liste (ex: "2025 Best Startups In France") plutôt qu'une vraie startup.

### 🔧 Améliorations recommandées (par ordre d'impact)
1. **Consolider les requêtes quasi-dupliquées** dans search_startups (results1-6 se chevauchent fortement) → −5 recherches/analyse sans perte.
2. **Cacher aussi les réponses IA stables** (extraction critères, analyse marché identiques pour mêmes inputs).
3. **Mutualiser le code dupliqué** : `braveSearch()` existe en deux copies (analyze-fund + due-diligence). Utiliser `_shared/search-api-client.ts` (déjà utilisé par advanced-sourcing).
4. **Job cron de purge** : supprimer `search_cache WHERE expires_at < now()`.
5. **Activer `verify_jwt` sur `due-diligence` et `advanced-sourcing`** (actuellement public).
6. **Webhook Stripe** (`stripe-webhook` function pas encore implémentée — décrit dans `PRODUCT_ROADMAP.md v2.1`).
7. **Pagination/pré-fetch** dans `AnalysisHistory.tsx` pour gros volumes.

---

## 11. Fichiers de référence

| Sujet | Fichier |
|-------|---------|
| Frontend page sourcing | [src/pages/Analyse.tsx](src/pages/Analyse.tsx) |
| Frontend page DD | [src/pages/DueDiligenceResult.tsx](src/pages/DueDiligenceResult.tsx) |
| Edge function sourcing (4 phases) | [supabase/functions/analyze-fund/index.ts](supabase/functions/analyze-fund/index.ts) |
| Edge function DD (2 phases) | [supabase/functions/due-diligence/index.ts](supabase/functions/due-diligence/index.ts) |
| Edge function sourcing avancé (LinkedIn + IP + weak signals) | [supabase/functions/advanced-sourcing/index.ts](supabase/functions/advanced-sourcing/index.ts) |
| Cache recherche partagé | [supabase/functions/_shared/search-cache.ts](supabase/functions/_shared/search-cache.ts) |
| Signaux faibles 8 catégories | [supabase/functions/_shared/weak-signals.ts](supabase/functions/_shared/weak-signals.ts) |
| Signaux LinkedIn 7 types | [supabase/functions/_shared/linkedin-signals.ts](supabase/functions/_shared/linkedin-signals.ts) |
| Signaux IP/brevets 7 types | [supabase/functions/_shared/ip-patent-signals.ts](supabase/functions/_shared/ip-patent-signals.ts) |
| Migration cache | [supabase/migrations/20260529_add_search_cache.sql](supabase/migrations/) |

---

**Pour une vue d'ensemble produit**, voir [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md).
**Pour les secrets et la config**, voir [SECRETS_CONFIGURATION.md](./SECRETS_CONFIGURATION.md).
