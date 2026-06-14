# Pipeline Sourcing + Due Diligence — Documentation

Mise à jour : 2026-06-14. Fonction : `supabase/functions/pipeline-orchestrator/index.ts`.

## Mission

Transformer les **critères de l'utilisateur** en UNE startup réellement alignée +
son rapport de due diligence niveau VC. **Anti-biais avant tout** : remonter des
pépites discrètes et early-stage, jamais les noms célèbres (licornes, Mistral…) ni
les coquilles de registre. La pertinence à la thèse et le bon stade priment sur la
notoriété.

```
Structuration thèse → Sourcing multi-source → Picking/Scoring → DD Search → DD Analyze
   (~15s, 1 IA)          (~45-65s)              (~10s, 1-2 IA)    (~35s)      (~50s, 1-2 IA)
```

Chaque étape = une invocation edge (self-invocation `action:"continue"`), pour
rester sous le wall-time ~150s. État dans `pipeline_jobs`. Watchdog + cron `sweep`.

---

## Entrée : critères utilisateur (plus de "nom de fonds")

`Analyser.tsx` + `CustomThesisInput.tsx` : cases à cocher MULTI secteurs + stades,
géographie, ticket, et un **bloc de texte libre** (thèse, exemples de startups,
portfolio). POST `{action:"start", customThesis}`.

---

## ÉTAPE 1 — Structuration de la thèse

1 appel Gemini (`prompts/thesis-analysis.ts`). Aucune recherche web. Les critères
saisis **font autorité** : l'IA respecte secteurs/stades/géo et déduit l'ICP,
`mustHaveKeywords`, `exclusionKeywords`, `stage.min/max`, `priorityQueries`. Le
texte libre précise l'ICP et les mots-clés. Cache 7j sur `thesis|custom|<hash>`.

---

## ÉTAPE 2 — Sourcing multi-source (le cœur anti-biais)

### Sources (en parallèle)

| Source | Rôle | Fichier | Coût |
|--------|------|---------|------|
| **Oxylabs (Bing SERP, parsed)** | recherche web principale (~50 req, batch 10, budget 60s) | `oxylabs-client.ts` | payant |
| **Apify (Google Search)** | couverture Google + requêtes FRAÎCHES/EARLY : `site:stationf.co`, lauréats French Tech/Bpifrance/Aerospace Valley, `site:pappers.fr "augmentation de capital"`, `site:linkedin.com/company` | `apify-client.ts` | payant |
| **Dealroom** | `just-founded.json` (startups tout juste fondées, filtrées thèse) | `dealroom-client.ts` | gratuit |
| INSEE SIRENE | immatriculations FR par code NAF | `insee-sirene.ts` | gratuit |
| Hacker News / GitHub | signal produit / tech | `hn-algolia.ts`, `github-search.ts` | gratuit |

> Google est BLOQUÉ par Oxylabs → on passe par **Bing** (parsed) pour le web, et
> **Apify** donne les résultats Google manquants. Apify tourne EN PARALLÈLE de la
> boucle de recherche (1 run batché de 5 requêtes, ~16-30s).

### Listicle / accelerator mining (`listicle-miner.ts`)

Les pages d'agrégateurs (F6S, Seedtable…) ET de **portfolios d'accélérateurs**
(Station F, French Tech, Bpifrance, YC, Antler…) sont des LISTES de startups → on
récupère leur texte (Oxylabs) et on en extrait les startups individuelles via 1
appel IA filtré sur la thèse (catégorie `web_curated`). **2 passes** : une sur les
résultats Bing, une sur les résultats Apify (accélérateurs). C'est ce qui fait
remonter les pépites early non célèbres (mesuré : `web_curated` 5 → 26 candidats).

### Premier classement — PILOTÉ PAR LES CRITÈRES (`dedup-ranker.ts`)

```
criteriaFit (0-100) = match textuel mustHave+secteurs (≤70) + bonus géo (15) − pénalité exclusion (30)
score = criteriaFit×1.4 + min(35, signalStrength×0.5) + recency(0-10) + crossSignalBonus(0-25)
```

La pertinence à la thèse PILOTE ; la force de signal ne fait que départager.
Catégories pondérées : `web_curated`/`dealroom` 5, `fresh` 4, etc. Puis
`filterByICP` (rejet hors-profil) → `resolveEntities` (1 IA anti-bruit) → dédup
inter-runs (`user_sourced_companies`, par utilisateur).

---

## ÉTAPE 3 — Picking & scoring (+ gate stade)

1. **Enrichissement structuré Dealroom** sur tous les top candidats :
   `dealroomEnrich(name)` → `entity-news` → stade réel détecté → stocké sur le
   candidat (`dealroomStage`) + contexte pour la DD.
2. **Scoring batché** (`scoring-engine.ts`, 1 appel IA, 8 dimensions pondérées,
   thesisFit dominant 0.45 FR / 0.50 hors-FR). Règles dures :
   - registre-seul (INSEE sans produit/équipe) → thesisFit≤45 + redFlag ;
   - **stade/notoriété** : société au-delà du stade max (licorne, cotée, >100M€
     levés, nom grand public type Mistral/Doctolib) → thesisFit≤15 + redFlag ; la
     notoriété n'est JAMAIS un signal positif ;
   - B2C/retail, sous-page produit de grand groupe, etc.
3. **Gate stade déterministe** (`looksTooLate`, triple défense) : exclut avant la
   shortlist toute société dont le stade RÉEL Dealroom > stade max visé, OU
   signalée hors-stade par l'IA, OU dont la description trahit Série C+/licorne/
   IPO/méga-levée (uniquement pour thèse early, stage.max ≤ serie-b).

Sortie : `picked_startup` + `shortlist`. Seuil de viabilité 20/100.

---

## ÉTAPES 4 & 5 — Due Diligence (niveau comité d'investissement)

`due-diligence` en 2 phases :
- **search** : ~28 requêtes web ciblées (équipe ×5-6, produit, marché, presse,
  profils, risques) + 5 requêtes équipe systématiques.
- **analyze** : 1 appel Gemini (`maxOutputTokens` **28000**) → rapport JSON complet.

Sections : product, market (TAM/SAM/SOM + analyse ≥150 mots + comparables nommés),
competition (3-5 concurrents CHACUN avec funding + forces/faiblesses), team,
traction, financials, risks (≥3/catégorie), opportunities, `investmentRecommendation`,
et surtout **`investmentCommittee`** :

> adéquation au mandat · bull case & bear case **probabilisés** · débats du comité
> (les deux côtés) · ce qui doit être vrai · critères rédhibitoires · vue
> valorisation/entrée · priorités de DD à fort enjeu · niveau de conviction ·
> **verdict argumenté** (façon associé qui défend/rejette en comité).

C'est l'analyse fine attendue d'un VC, pas une redite des forces/faiblesses.
Anti-hallucination : pas d'URL dans le texte (uniquement dans `sources`),
estimations explicitement marquées. Rendu : `InvestmentMemo.tsx` (mémo continu,
sommaire sticky, blocs qui ne tronquent jamais le texte).

---

## Économie de tokens (à optimiser au prochain run)

### Gemini — LE vrai goulot (free tier)
- 5 clés en rotation (`GEMINI_API_KEY`..`GEMINI_KEY_5`), garde-fou `ai_usage_daily`
  (`AI_DAILY_LIMIT=1100`, RPC `increment_ai_usage`).
- Appels par run À FROID : thèse(1) + mining web(1) + mining Apify(1) +
  resolveEntities(1) + scoring batch(1) + DD gap(1) + DD analyze(1) [+ DD gap2/enrich
  parfois] ≈ **6-8 appels Gemini**.
- Caches : thèse 7j, recherche 14j (préfixe `ai|` / `all|`) → re-run quasi-identique
  ≈ 0-2 appels.
- Pistes : router davantage vers **Flash** (cheap) et réserver Pro à la thèse +
  scoring ; mutualiser mining web + mining Apify en 1 appel ; cacher l'enrichissement
  Dealroom.

### Oxylabs — plan Starter (~3000 req/mois)
- ~50 req sourcing + ~3 pages minées (×2 passes ≈ 6) + ~28 req DD search ≈ **~85 req/run**.
- Le cache 14j absorbe les requêtes répétées. Piste : baisser le cap sourcing si
  Apify+Dealroom couvrent déjà la fraîcheur.

### Apify
- 1 run batché (5 requêtes Google) par sourcing. Coût modéré ; surveiller le quota
  du compte (formative_zeppelin).

---

## Résultats validés

| Critères | Pick | Note |
|----------|------|------|
| Fintech + SaaS B2B, Seed+A, France | Cryptio/Kestra/Meelo… | on-thesis FR |
| Deeptech + Healthtech, Pre-seed+Seed, Europe | Diamfab (fit 95) | deeptech FR early |
| Deeptech + IA, Seed/A/B, France | **Skyld** | cyber/IA on-device, **non célèbre** + IC analysis présente |

La thèse respecte les secteurs/stades cochés, le texte libre oriente ICP +
exclusions, le classement remonte des startups réelles on-thesis et early, et le
gate stade écarte les licornes connues.

---

## Reste à faire (anti-biais + robustesse)

1. **Élargir Dealroom** : sourcer via `marketmaps` par tag (France/Deep Tech) en plus de `just-founded`.
2. **File durable** (Supabase Queues/pg_cron) au lieu du fire-and-forget.
3. **Boucle de feedback** (pouce haut/bas → few-shot dans thèse + scoring).
4. **Banc d'éval** (precision@5 sur 8-10 thèses fixes) pour mesurer chaque changement.
5. **Oxylabs `google_search`** parsé à tester (Google sans Apify).
