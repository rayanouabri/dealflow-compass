# Pipeline Sourcing + Due Diligence — Documentation

## Vue d'ensemble

AI-VC transforme les **critères de recherche saisis par l'utilisateur** en un rapport
de due diligence complet, via un pipeline chaîné (une étape = une invocation Edge
Function, pour rester sous le wall-time Supabase ~150s par étape).

```
Structuration thèse → Sourcing multi-source → Picking/Scoring → DD Search → DD Analyze
      (~15s)               (~45-60s)             (~10s)         (~35s)      (~50s)
```

Fonction principale : `supabase/functions/pipeline-orchestrator/index.ts`
(self-invocation `action: "continue"` entre chaque étape).

> **Changement clé (juin 2026)** : l'utilisateur ne donne plus un nom de fonds à
> rechercher. Il saisit directement ses critères (secteurs, stades, géographie,
> ticket, texte libre). On ne dépense plus de budget de recherche pour deviner la
> thèse d'un fonds — ce budget est réalloué au sourcing.

---

## Entrée : critères utilisateur

Formulaire `src/pages/Analyser.tsx` + `src/components/CustomThesisInput.tsx`.
L'utilisateur **coche** (multi-sélection) et précise :

```json
{
  "sectors": ["Deeptech", "Healthtech / Biotech"],   // multi
  "stages": ["Pre-seed", "Seed"],                     // multi
  "geography": "Europe",                              // 1 zone principale
  "ticketSize": "< 500 K€",                           // optionnel
  "description": "Startups deeptech à forte IP (façon Alice & Bob, Pasqal). Éviter ESN, conseil."
}
```

`sectors` et `stages` sont des **cases à cocher multiples**. `description` est un
bloc de texte **optionnel** (thèse, critères, exemples de startups / portfolio).
Lancement : POST `pipeline-orchestrator` `{ action: "start", customThesis }`.

---

## ÉTAPE 1 — Structuration de la thèse (`handleThesisAnalysis`)

Aucune recherche web. Un seul appel Gemini (2.5-pro) qui **structure** les critères
de l'utilisateur en stratégie de sourcing. Les critères saisis **font autorité** :
l'IA respecte secteurs/stades/géographie à la lettre et n'invente pas une thèse
générique. Le texte libre est exploité pour préciser l'ICP et les mots-clés.

Prompt : `_shared/prompts/thesis-analysis.ts`. Cache 7 j sur `thesis|custom|<hash>`.

### Sortie (extrait)

```json
{
  "sectors": ["Deeptech", "Healthtech", "Biotech"],
  "stage": { "min": "pre-seed", "max": "seed" },
  "geography": { "primary": "Europe", "frenchBias": false },
  "idealCompanyProfile": {
    "definition": "...",
    "mustHaveKeywords": ["propriété intellectuelle", "brevet", "recherche scientifique", "deeptech"],
    "exclusionKeywords": ["Agence", "ESN", "Conseil", "SaaS générique"],
    "nafCodes": ["72.19Z"],
    "inseeNameTokens": ["bio", "labs", "tech"]
  },
  "searchStrategy": { "priorityQueries": ["..."] }
}
```

`min` = stade le plus précoce coché, `max` = le plus avancé. Validation de forme :
si la réponse n'a pas `sectors[]` + `idealCompanyProfile`, l'étape échoue (retry).

---

## ÉTAPE 2 — Sourcing multi-source (`handleSourcingStart`)

### Sources interrogées en parallèle

| Source | Coût | Rôle |
|--------|------|------|
| **Oxylabs (Bing SERP)** | payant | recherche web principale (`searchAll`) |
| INSEE SIRENE | gratuit | immatriculations FR récentes par code NAF |
| Hacker News (Algolia) | gratuit | Show HN = signal produit |
| GitHub | gratuit | orgs tech (thèses logicielles) |
| **Listicle mining** (Oxylabs) | payant | extraction de startups depuis F6S/Seedtable/EU-Startups… |

> Google bloque Oxylabs → on utilise **Bing** (`source: "bing_search", parse: true`),
> réponse JSON structurée ~2.7 s/req. Timeout dur 9 s, batch 10.

### Requêtes

`buildFrenchBiasedQueries(sectors, stage, geography)` + priorityQueries de l'IA +
signaux LinkedIn société + signaux IP/brevets. **Cap : 50 requêtes** (relevé de 40
grâce au budget libéré par la suppression de la recherche de thèse), avec un garde-fou
temps de **60 s** (on arrête de lancer des batches au-delà).

### Listicle mining (`_shared/listicle-miner.ts`)

Les pages d'agrégateurs (F6S, Seedtable, EU-Startups, ai-startups.pro…) listent de
vraies startups finançables. Au lieu de les jeter, on récupère leur texte via Oxylabs
et on en **extrait les noms** via un appel IA filtré sur la thèse. Catégorie
`web_curated` — c'est la source des candidats réels et reconnaissables.

### Premier classement — PILOTÉ PAR LES CRITÈRES (`deduplicateAndRank`)

L'ancienne formule `(weighted_mentions × signal_types_count) + recency + cross_signal`
classait par **volume de signal** — inadaptée (une coquille très mentionnée passait
devant une startup on-thesis). Nouvelle formule, pilotée par l'**adéquation aux
critères de l'utilisateur** :

```
criteriaFit (0-100)  = match textuel des mustHaveKeywords + secteurs (jusqu'à 70)
                       + bonus géographie (15)
                       − pénalité si terme d'exclusion présent (30)

score = criteriaFit × 1.4                      ← moteur principal (pertinence thèse)
      + min(35, signalStrength × 0.5)          ← corroboration multi-sources (plafonnée)
      + recencyScore (0-10)
      + crossSignalBonus (0-25)
```

`signalStrength = Σ poids(catégories) × min(mentions, 15)`. La force de signal ne fait
plus que **départager** à pertinence égale. Les startups minées (`web_curated`,
déjà on-thesis) sont injectées en tête via `mergeMinedCandidates`.

Puis `filterByICP` (rejet des acteurs hors-profil) → `resolveEntities` (1 appel IA :
nettoie les noms, écarte le bruit, note la pertinence) → mémoire utilisateur (écarte
les sociétés déjà proposées).

---

## ÉTAPE 3 — Picking & Scoring (`handlePicking`)

Top candidats scorés en **un seul appel IA batché** (`buildBatchScoringPrompt`),
8 critères pondérés (`scoring-engine.ts`) :

```
thesisFit 0.45 (FR) / 0.50 (hors FR)   ← dominant
signalDiversity 0.12 · sourceCorroboration 0.08 · frenchEcosystem 0.13
timing 0.08 · teamQuality 0.10 · competitivePosition 0.04 · recency 0.00
totalWeighted = Σ(scores[k] × poids[k])
```

Garde-fous :
- **Coquille registre** (seul signal = immatriculation INSEE, sans produit/équipe/
  traction) → thesisFit plafonné ≤ 45 + redFlag : un nom n'est pas une preuve.
- Quota diversité : max 3 candidats purement registre dans la shortlist.
- `thesisFit ≥ 55` = gate strict ; sinon repli sur les vraies entreprises.
- Score viable minimal 20 (sinon erreur → retry).

Le meilleur candidat est retenu (`picked_startup`), le reste forme la `shortlist`.

---

## ÉTAPE 4 & 5 — Due Diligence (`due-diligence` function)

**DD Search** : recherche web (Oxylabs) sur la startup retenue — produit, marché,
équipe (5 requêtes équipe systématiques), financement, concurrence.

**DD Analyze** : un appel Gemini produit le rapport JSON complet
(`maxOutputTokens` 16384). Exigences de profondeur (prompt) : ≥ 4 highlights/risks,
≥ 3 points par catégorie de risque, 3-5 concurrents **chacun** avec funding +
forces/faiblesses, market.analysis ≥ 150 mots avec comparables nommés, rationale VC
structurée. Anti-hallucination : pas d'URL dans le texte (uniquement dans `sources`),
estimations explicitement marquées.

### Rendu : `src/components/InvestmentMemo.tsx`

Mémo continu (plus d'onglets) : sommaire sticky avec scroll-spy, blocs qui ne
tronquent jamais le texte (`break-words`), sections résumé → produit → marché →
concurrence → équipe → traction → financements → risques → opportunités →
recommandation → sources → assistant IA.

---

## Performance & coûts

- Pipeline complet : ~150 s (chaque étape sous le wall-time edge).
- Oxylabs : plan Starter 20 $/mois (3000 req). ~50 req sourcing + ~3 pages minées +
  ~30 req DD par run.
- Gemini : structuration thèse (1) + mining (1) + résolution (1) + scoring batch (1)
  + DD analyze (1) ≈ 5 appels / run.

## Résultats validés (exemples réels)

| Critères saisis | Pick | Shortlist |
|-----------------|------|-----------|
| Fintech + SaaS B2B, Seed+A, France | — | Cryptio, Kestra, Meelo, Cobl.ai, Edana |
| Deeptech + Healthtech, Pre-seed+Seed, Europe | Diamfab (fit 95) | Healshape, Unseenlabs, Vera Genetics, Latitude |

La thèse structurée respecte exactement les secteurs/stades cochés, le texte libre
oriente l'ICP et les exclusions, et le classement remonte des startups réelles
on-thesis (et non des coquilles très mentionnées).
