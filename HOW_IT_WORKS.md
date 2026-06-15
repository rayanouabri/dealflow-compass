# Comment fonctionne AI-VC

Documentation pratique du pipeline réel. Mise à jour : 2026-06-15.

> Explication pas-à-pas pour débutant (vocabulaire compris) : [GUIDE_COMPLET.md](./GUIDE_COMPLET.md).
> Détail du sourcing/DD : [PIPELINE_SOURCING_DD.md](./PIPELINE_SOURCING_DD.md). Contexte projet : [CLAUDE.md](./CLAUDE.md).

---

## 1. Mission & vue d'ensemble

SaaS pour fonds VC. L'utilisateur saisit **ses critères** (secteurs, stades,
géographie, texte libre) ; l'outil source UNE startup réellement alignée et
génère son rapport de due diligence.

**Mission anti-biais** : remonter des **pépites discrètes et early-stage**, pas
les noms célèbres ni les coquilles de registre. La pertinence à la thèse et le
stade priment toujours sur la notoriété.

```
Frontend React (Vercel, ai-vc-sourcing.vercel.app)
        │ HTTPS + JWT
Supabase Edge Functions (Deno) : pipeline-orchestrator · due-diligence · ai-qa
        │
Postgres (pipeline_jobs, search_cache, user_sourced_companies, pick_feedback, ai_usage_daily)
        │
Sources : Oxylabs(Google) · Apify(Google) · Dealroom(just-founded + marketmaps) · INSEE · HN · GitHub · Gemini(gemini-3.5-flash, 9 clés)
```

Plus de fonction `analyze-fund`, plus de flux "nom de fonds", plus de Brave/Serper,
plus de Vertex — supprimés. Le SEUL moteur de sourcing est `pipeline-orchestrator`.

---

## 2. Parcours utilisateur

1. `/analyser` ([Analyser.tsx](src/pages/Analyser.tsx)) : l'utilisateur coche
   secteurs + stades, choisit la géo, précise sa thèse en texte libre. POST
   `pipeline-orchestrator {action:"start", customThesis}`.
2. `/pipeline?id=…` ([PipelineProgress.tsx](src/pages/PipelineProgress.tsx)) :
   poll `status` toutes les 3s, affiche l'avancement puis le pick + shortlist.
3. Clic "Voir le rapport" → `/due-diligence/result` qui rend le rapport DD
   **déjà stocké** ([InvestmentMemo.tsx](src/components/InvestmentMemo.tsx)) — aucune DD rejouée.
4. "Mes analyses" (sur `/analyser`, si connecté) réouvre n'importe quel run passé
   (action `history`) sans relancer de DD. Comptes **illimités**.

---

## 3. Le pipeline (5 étapes, self-invocation)

`pipeline-orchestrator` enchaîne 5 étapes ; chaque étape se ré-appelle
(`action:"continue"`) pour ne pas dépasser le wall-time edge (~150s). État dans
`pipeline_jobs`. Robustesse : watchdog (`selfHealIfStuck` au poll) + cron `sweep`.

1. **Structuration de la thèse** — 1 appel Gemini (`prompts/thesis-analysis.ts`)
   qui structure les critères de l'utilisateur (autoritaires) en ICP +
   mustHaveKeywords + exclusionKeywords + stage min/max + priorityQueries. AUCUNE
   recherche web (le budget est réalloué au sourcing). Cache 7j.
2. **Sourcing multi-source** — voir §4.
3. **Picking** — scoring IA batché + gate stade déterministe (voir §5).
4. **DD Search** — `due-diligence` phase `search` : recherche web sur la startup.
5. **DD Analyze** — `due-diligence` phase `analyze` : 1 appel Gemini → rapport JSON
   complet, dont la section **Comité d'investissement** (voir §6).

---

## 4. Sourcing — les sources (anti-biais)

| Source | Rôle | Coût |
|--------|------|------|
| **Oxylabs (Google SERP, parsé)** | recherche web principale (~50 req). Google n'est plus bloqué sur le compte actuel → couverture Google directe (avant : repli Bing) | payant |
| **Apify (Google Search)** | 2ᵉ source Google + requêtes ciblées (Station F, lauréats French Tech/Bpifrance, Pappers "augmentation de capital", LinkedIn société) — **fraîcheur & early** | payant |
| **Dealroom** | `just-founded` (tout juste fondées) + **`marketmaps` par tag** (Deep Tech / Fintech / France…) + enrichissement stade/levée | gratuit, no-auth |
| INSEE SIRENE | immatriculations FR récentes par code NAF | gratuit |
| Hacker News / GitHub | signal produit / tech | gratuit |

**Listicle mining** (`listicle-miner.ts`) : les pages d'agrégateurs ET de
portfolios d'accélérateurs (F6S, Seedtable, **Station F, French Tech, Bpifrance**…)
sont des LISTES de startups → on récupère leur texte et on en extrait les noms
individuels via **1 seul appel IA mutualisé** (catégorie `web_curated`) sur l'union des pages
ramenées par Oxylabs ET Apify (avant : 2 appels distincts).

**Premier classement criteria-aware** (`dedup-ranker.ts`) : `score = criteriaFit×1.4
+ min(35, signalStrength×0.5) + recency + crossSignalBonus`. La pertinence à la thèse
PILOTE ; le volume de signal ne fait que départager. Puis `filterByICP` →
`resolveEntities` (1 appel IA anti-bruit) → dédup inter-runs (`user_sourced_companies`).

---

## 5. Picking — scoring + gate stade

- **Enrichissement structuré Dealroom** sur tous les top candidats : `dealroomEnrich(name)`
  → stade réel via `entity-news` → stocké sur le candidat.
- **Scoring batché** (`scoring-engine.ts`, 1 appel IA, 8 dimensions, thesisFit dominant
  0.45/0.50). Règles dures : registre-seul → thesisFit≤45 ; **stade/notoriété** → une
  société au-delà du stade max visé (licorne, cotée, >100M€ levés, nom grand public)
  → thesisFit≤15 + redFlag ; la notoriété n'est jamais un signal positif.
- **Gate stade déterministe** (`looksTooLate`) : exclut avant la shortlist toute
  société dont le stade RÉEL Dealroom > stade max, ou dont la description trahit
  Série C+/licorne/IPO/méga-levée, **un rachat ("acquise par")**, une **levée en
  milliards**, ou un **âge > 15 ans**. Triple défense (miner + scoring + gate).

Résultat : `picked_startup` + `shortlist`. Exemples validés : Diamfab, Skyld
(deeptech FR early, pas de noms célèbres).

---

## 6. Due Diligence — niveau comité d'investissement

`due-diligence` en 2 phases. **search** : ~28 req web. **analyze** : recherches
systématiques (nom entre guillemets, récence en priorité) → boucle lacunes (4-6
thèmes) → brouillon (1 gros appel Gemini, 28000 tokens) → **approfondissement
OBLIGATOIRE** (couche Gemini de critique du brouillon → recherches parallèles →
réécriture qui creuse avec chiffres + sources) → vérification anti-hallucination.
Le brouillon suit la **"discipline d'analyse VC"** : démontrer chaque argument
(chiffre/date/nom/source, jamais d'adjectif seul), thèse falsifiable, corréler les
sections, mécanique du deal, modèle de retour + comparables de sortie nommés, bear
case spécifique, décision conditionnelle, + la **"méthode par levier"** (la métrique
qui EST le produit, moat chiffré sinon non-prouvé, business model → multiple de
sortie). Le bloc **`investmentCommittee`** (thèse, verdict, bull/bear, mécanique du
deal, modèle de retour, débats, ce qui doit être vrai, critères rédhibitoires, vue
valo, priorités DD, conviction) est rendu dans `InvestmentMemo`. Cache `ddreport|v4`
(3 j ; le numéro de version monte à chaque refonte de prompt pour invalider l'ancien).
**Export** : PDF mis en forme (inclut le comité) + Markdown.

---

## 7. Économie de tokens (à optimiser)

**Gemini** : modèle **`gemini-3.5-flash`** partout, **9 clés** en rotation
(`GEMINI_API_KEY` + `GEMINI_KEY_2..9`, via `getGeminiKeys()` partagé ; appels DD
auxiliaires via `geminiDD()` qui mélange les clés + bascule sur 429). Garde-fou
`ai_usage_daily` (`AI_DAILY_LIMIT=2000`). Appels par run À FROID : thèse(1) +
mining mutualisé(1) + resolveEntities(1) + scoring batch(1) + DD lacunes(1) + DD
brouillon(1) + DD critique(1) + DD réécriture(1) ≈ **7-9 appels**. Caches : thèse 7j,
recherche 14j, rapport DD 3j → un re-run quasi-identique ≈ 0-2 appels. ⚠️ Vérifier que
`gemini-3.5-flash` est couvert par le free tier du compte (sinon facturation).

**Oxylabs** (plan Starter, ~3000 req/mois) : ~50 req sourcing + ~3 pages minées +
~28 req DD search = **~80 req/run**.

**Apify** : 1 run batché (5 requêtes Google en 1 appel) par sourcing, ~16-30s.

---

## 8. Tester / debugger

- Health pipeline : POST `pipeline-orchestrator {action:"start", customThesis:{sectors,stages,geography}}` avec un JWT service-role, puis poll `pipeline_jobs`.
- Statuts : `thesis_analyzing → sourcing_running → sourcing_done → picking → pick_done → dd_search_running → dd_search_done → dd_analyze_running → dd_done`.
- Job figé : le `started_at` ne bouge plus ; watchdog/cron relancent. Forcer : POST `{action:"continue", pipelineId}` en service-role.
- Logs : Dashboard Supabase → Functions → Logs, ou MCP `get_logs(service:"edge-function")`.

---

## 9. Ce qu'il reste à faire

Déjà fait depuis : marketmaps Dealroom branchés, feedback 👍/👎 (exclusion +
few-shot), Oxylabs passé à `google_search`, DD niveau VC + approfondissement
obligatoire + export PDF, gate stade durci, 9 clés Gemini.

Reste à faire :
- **Fiabilité** : remplacer le self-invocation fire-and-forget par une file durable (Supabase Queues / pg_cron).
- **Mesure** : banc d'éval (8-10 thèses fixes, precision@5) pour objectiver chaque changement. Sans gold-list : un "juge VC" automatique qui note chaque rapport.
- **Sourcing pépites** : portfolios de VC stade-en-dessous, lauréats de subventions, dépôts d'augmentation de capital (Pappers/BODACC), matching sémantique thèse↔société, ranking anti-notoriété (cf analyse sourcing).
- **DD** : lecture des sources primaires (papiers/brevets en texte intégral), sources inline numérotées par affirmation.
