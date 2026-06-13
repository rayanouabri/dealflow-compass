# Pipeline Sourcing + Due Diligence - Documentation Complète

## Vue d'ensemble

AI-VC exécute une pipeline complexe en 5 étapes pour transformer une thèse d'investissement en rapports due diligence détaillés :

```
Analyse Thèse → Sourcing Multi-Source → Picking/Scoring → DD Search → DD Analyze
     (45s)          (180s max)            (120s)         (150s)       (300s)
```

---

## Exemple: Supernova Invest

Pour illustrer la pipeline complète, on va suivre un sourcing réel pour **Supernova Invest** (fonds deep tech français).

### Thèse Supernova Invest (fictive pour cet exemple)

```json
{
  "fundName": "Supernova Invest",
  "sectors": ["deep tech", "quantum computing", "materials science"],
  "stage": {
    "min": "pre-seed",
    "max": "series-a"
  },
  "geography": {
    "primary": "France",
    "frenchBias": true
  },
  "avgTicket": "500k-2M EUR",
  "idealCompanyProfile": {
    "definition": "Startups avec technologie breakthrough (brevets, IP, R&D), équipes fondateurs issus de la recherche ou grandes tech",
    "mustHaveKeywords": ["quantum", "materials", "semiconductor", "nanotechnology", "photonics", "AI chip"],
    "exclusionKeywords": ["consulting", "service provider", "SaaS generic", "marketplace"]
  }
}
```

---

## ÉTAPE 1: Analyse de la Thèse (analyze-fund function)

### Input
- Fund name: "Supernova Invest"
- Ou custom thesis

### Process

1. **Web Search pour contexte du fonds** (Brave Search, 5-10 requêtes)
   - "Supernova Invest funding thesis"
   - "Supernova Invest portfolio companies"
   - "Supernova Invest deep tech quantum"

2. **Extraction des criteria par Gemini** → JSON structuré
   - Secteurs: deep tech, quantum, materials
   - Stage: pre-seed à Series A
   - Géographie: France + Europe
   - Keywords obligatoires: quantum, materials, semiconductor, photonics
   - Exclusions: consulting, marketplace, SaaS generic

3. **Analyse du marché** (optionnel)
   - TAM du quantum computing
   - Competitors knowns dans le portefeuille

### Output

```json
{
  "sectors": ["deep tech", "quantum computing", "materials science"],
  "stage": {"min": "pre-seed", "max": "series-a"},
  "geography": {"primary": "France", "frenchBias": true},
  "avgTicket": "500k-2M EUR",
  "searchStrategy": {
    "priorityQueries": [
      "quantum computing startup France",
      "quantum chip fabrication",
      "topological materials startup"
    ]
  },
  "idealCompanyProfile": {
    "definition": "Startups avec technologie brevetée, équipes PhD/ex-GAFAM",
    "mustHaveKeywords": ["quantum", "materials", "semiconductor"],
    "exclusionKeywords": ["consulting", "marketplace", "saas generic"]
  },
  "confidence": "high",
  "dataQuality": "good"
}
```

---

## ÉTAPE 2: Sourcing Multi-Source (handleSourcingStart)

### Input
- Thesis: {sectors, stage, geography, mustHaveKeywords, exclusionKeywords}
- targetCount: 1-3 startups

### Process

Le sourcing lance **7 couches de recherche EN PARALLÈLE** :

#### A. Recherche Web (Brave Search) — 80 requêtes max
**Requêtes générées** depuis la thèse (buildFrenchBiasedQueries):
```
Categories:
- Stage-aware: "pre-seed quantum startup France", "Series A deep tech"
- Sector: "quantum computing startups", "materials science innovation"
- Precision: "photonic integrated circuits startup", "topological insulator"
- Geographic: "Paris deep tech", "Île-de-France quantum"

Example for Supernova:
- "quantum startup France pre-seed 2024"
- "quantum chip startup EUR"
- "materials science deeptech France"
- "photonics startup Series A"
- "topological computing startup"
```

**Per-query processing**:
```
1. Execute Brave Search (5 results per query)
2. Extract all URLs + titles + descriptions
3. Deduplicate by normalized URL
4. Filter out aggregators (LinkedIn company, GitHub org, Crunchbase, etc.)
5. Filter out known noise (agencies, media, directories)
```

#### B. INSEE Search (France Registry) — If geography has "france"
```
NAF codes for quantum/materials:
- 7220Z: R&D in natural sciences & engineering
- 4799B: Sale of other specialized goods

Output: ~15-25 newly registered companies (past 120-270 days, depending on stage)
```

#### C. GitHub Search — If sectors contain tech/AI/ML keywords
```
Queries:
- "quantum computing" (org:*) stars:>5
- "topological materials" in:readme stars:>10
- "quantum simulator" user:founders
```

#### D. Hacker News (Show HN) — 540/365 days lookback
```
Queries: ["quantum", "deeptech", "materials"]
Example match: "Show HN: I built a quantum simulator in Rust"
```

#### E. LinkedIn Company Signals
```
Queries targeting:
- "linkedin.com/company" + quantum
- Company hiring bursts (Job Board signals)
- New hires: CTOs, VPs Engineering, Research leads
```

#### F. IP & Patent Signals
```
- Google Patents: quantum computing + photonics
- INPI (French patent office)
- Inventor → founder mapping (is the CTO a known inventor?)
```

#### G. Weak Signals Layer
```
- Product Hunt: quantum computing product launches
- Wellfound: quantum startups in fundraising
- Y Combinator: quantum computing cohorts
- Incubators: Station F quantum companies
```

### Deduplication & Ranking (dedup-ranker.ts)

**Output: Top 50-100 candidates with scores**

```typescript
interface SourcingCandidate {
  name: "QuantumX" // startup name
  url: "quantumx.fr" // website
  mentionCount: 15 // total mentions across all sources
  categories: Set["web", "github", "linkedin", "patent"] // signal types
  sources: ["quantumx.fr", "github.com/quantumx", "linkedin.com/company/quantumx"]
  score: 78 // weighted score (mentions × signal diversity × recency)
  crossSignalBonus: 12 // bonus if mentioned in 3+ different sources
}
```

**Scoring formula**:
```
score = (weighted_mentions × signal_types_count) + recency_bonus + cross_signal_bonus

Example:
- 5 web mentions (×2 weight each) = 10
- 3 GitHub mentions (×4 weight) = 12
- 1 patent mention (×4 weight) = 4
- Signal diversity (3 types) = +8
- Recent signal (year=2024) = +2
- Cross-signal (patent + GitHub + web) = +12
= 48 raw score → normalized to 0-100
```

### Output: 10-20 qualified candidates
```
[
  {
    "name": "QuantumX",
    "url": "quantumx.fr",
    "score": 78,
    "descriptions": [
      "QuantumX develops quantum simulation software for drug discovery",
      "Founded 2023, based in Paris, 8-person team",
      "Patent filed: quantum molecular simulation algorithm"
    ]
  },
  ...
]
```

---

## ÉTAPE 3: Picking (Scoring & Selection)

### Input
- Top 10 candidates from sourcing
- Thesis analysis

### Process

#### 1. Pre-enrichment of registry candidates
```
For INSEE-only startups (no web presence):
- Perform 1 web search: "[Company Name] startup France"
- Extract 3 results → descriptions
- Try to find official website domain
→ This gives the IA scorer some actual signal, not just a KBIS line
```

#### 2. Batch Scoring avec Gemini
```
Call: buildBatchScoringPrompt(candidates, thesis)

Prompt structure:
- Thesis: sectors, stage, geography, must-have keywords
- Per-candidate: name, url, descriptions, signal types, mentions count

IA returns:
{
  "rankings": [
    {
      "index": 0,
      "scores": {
        "thesisFit": 72,        ← Most important (45-50% of total)
        "signalDiversity": 80,  ← Multiple signal types
        "sourceCorroboration": 65, ← Mentioned in multiple sources
        "frenchEcosystem": 90,  ← Paris/France bonus
        "timing": 50,           ← "Why now" resonance
        "teamQuality": 75,      ← Founder background signals
        "competitivePosition": 60, ← Moat/differentiation
        "recency": 85           ← Recent signals (2024)
      },
      "whyThisStartup": "Strong quantum IP signal + ex-GAFAM CTO",
      "whyNow": "Quantum hardware race accelerating, good timing",
      "redFlags": ["Newly registered, limited traction data"],
      "comparables": ["IonQ", "Rigetti Computing"],
      "riskLevel": "medium"
    }
  ]
}
```

#### 3. Compute weighted score
```
totalWeighted = ∑(scores[key] × weights[key])

Weights (French geography):
- thesisFit: 0.45         ← DOMINANT
- signalDiversity: 0.12
- sourceCorroboration: 0.08
- frenchEcosystem: 0.13
- timing: 0.08
- teamQuality: 0.10
- competitivePosition: 0.04
- recency: 0.00           ← Don't reward old signals

Example:
totalWeighted = (72×0.45) + (80×0.12) + (65×0.08) + (90×0.13) + (50×0.08) + (75×0.10) + (60×0.04) + (85×0)
             = 32.4 + 9.6 + 5.2 + 11.7 + 4 + 7.5 + 2.4 + 0
             = 72.8 / 100
```

#### 4. Filtering
```
// Remove noise (articles, conferences, non-companies)
realCompanies = candidates.filter(s => !s.redFlags.includes("not a company"))

// Remove poorly-aligned startups
wellAligned = realCompanies.filter(s => s.scores.thesisFit >= 55)

// Fallback if too aggressive
finalShortlist = wellAligned.length > 0 ? wellAligned : realCompanies

// Viability gate: if best score < 20, sourcing failed → retry
if (finalShortlist[0].score < 20) throw Error("Sourcing insufficient")
```

#### 5. Result: Pick winner + shortlist
```
PICKED: QuantumX (score: 72.8)
SHORTLIST (alternatives):
- QBit Technologies (score: 68)
- PhotonicLabs (score: 65)
- TopoMaterials (score: 62)
```

---

## ÉTAPE 4: DD Search (due-diligence phase 1)

### Input
- Company name: "QuantumX"
- Company website: "quantumx.fr" (if found)
- Thesis: sectors, stage, etc.

### Process

#### 1. Parallel research queries (~30-40 total)
```
Category 1: Company fundamentals (5-6 queries)
- "QuantumX funding"
- "QuantumX team founders"
- "QuantumX valuation"
- "QuantumX investors"
- "QuantumX LinkedIn"
- "QuantumX Crunchbase"

Category 2: Product & Technology (5-6 queries)
- "QuantumX quantum simulator"
- "QuantumX product demo"
- "QuantumX technology patent"
- "QuantumX customers users"
- "QuantumX software architecture"

Category 3: Market & Traction (5-6 queries)
- "QuantumX Series A funding round"
- "QuantumX partnerships"
- "QuantumX press release"
- "QuantumX CEO interview"
- "QuantumX awards recognition"

Category 4: Competition (5 queries)
- "QuantumX vs IonQ"
- "QuantumX vs Rigetti"
- "quantum simulation software comparison"
- "quantum computing startups 2024"

Category 5: Risks & Controversy (5 queries)
- "QuantumX layoffs"
- "QuantumX legal issues"
- "QuantumX failed pivot"
- "quantum computing hype cycle risk"
- "hardware development risks quantum"

Category 6: Team Deep Dive (8-10 queries) ← THIS IS IMPORTANT
- "QuantumX founder John Doe"
- "site:linkedin.com QuantumX engineering"
- "QuantumX team members"
- "QuantumX CTO background"
- "John Doe quantum research PhD"
- "QuantumX hiring jobs"
- "QuantumX key hires 2024"
```

#### 2. Cache + dedup
```
- Cache all results by (company_name, query) → 7-day TTL
- Deduplicate URLs → keep only 1 result per domain per topic
- Extract unique URL list → ~80-120 results

Output searchResults:
[
  {
    "title": "QuantumX Raises $5M Series A from Supernova Invest",
    "description": "QuantumX, a quantum simulation startup...",
    "url": "techcrunch.com/quantumx-series-a"
  },
  {
    "title": "Meet the Team: QuantumX Quantum Simulator",
    "description": "John Doe (CEO), Marie Dupont (CTO, ex-IBM), ...",
    "url": "quantumx.fr/team"
  },
  ...
]
```

### Output: searchContext (passed to DD Analyze phase)
```json
{
  "jobId": "dd-12345",
  "companyName": "QuantumX",
  "searchResults": [...80 results...],
  "searchResultsCount": 87,
  "status": "done"
}
```

---

## ÉTAPE 5: DD Analyze (due-diligence phase 2)

### Input
- searchContext: {searchResults, companyName}
- Thesis for context

### Process

#### 1. Build mega-prompt for Gemini
```
System: "Tu es analyste VC senior avec 15+ ans d'expérience"

Prompt structure:
- Instructions détaillées pour chaque section
- Liste des 12 weak signals à chercher (patents, GitHub, product traction, etc.)
- Critères de validation (2 sources min par fact)
- Format JSON requis avec 7 sections:
  1. Company profile
  2. Executive Summary
  3. Product & Technology
  4. Market & TAM
  5. Competition
  6. Financials & Metrics
  7. Team
  8. Traction
  9. Risks
  10. Investment Recommendation
  11. Analysis metadata

Example for Team section:
"ÉQUIPE : OBLIGATOIRE
- Founders: nom, background, LinkedIn, previous exits
- Key executives: CTO, VP Eng, etc.
- Team size + growth
- Advisors + board
- RED FLAG: no team info found or suspicious info → mention in confidence"
```

#### 2. Call Gemini 2.5-pro
```
Temperature: 0.1 (deterministic)
maxTokens: 12000

Processing:
1. Gemini reads searchContext (87 results)
2. Extracts data per section
3. For each metric: prioritize real data → estimation → N/A
4. Validates with "2 sources min" rule
5. Returns JSON

Example output for Team:
{
  "team": {
    "overview": "Experienced deeptech team with strong academic background",
    "founders": [
      {
        "name": "John Doe",
        "role": "CEO & Co-founder",
        "background": "PhD Physics, MIT; 5 years at Google Quantum AI",
        "linkedin": "linkedin.com/in/johndoe",
        "source": "quantumx.fr/team, LinkedIn profile"
      },
      {
        "name": "Marie Dupont",
        "role": "CTO & Co-founder",
        "background": "PhD Materials Science, Stanford; ex-IBM Quantum",
        "linkedin": "linkedin.com/in/mariedupont",
        "source": "quantumx.fr/team"
      }
    ],
    "keyExecutives": [
      {
        "name": "Bob Smith",
        "role": "VP Business Development",
        "background": "Previously at Rigetti Computing, 10 years enterprise sales"
      }
    ],
    "teamSize": "12 full-time engineers + 3 advisors",
    "hiringTrends": "Actively hiring for quantum algorithms engineer role",
    "sources": [
      {"name": "QuantumX team page", "url": "quantumx.fr/team"},
      {"name": "LinkedIn search", "url": "linkedin.com/search/..."}
    ]
  }
}
```

#### 3. Validation & deterministic corrections
```
- Check for hallucinations: all URLs must be findable in searchResults
- If "John Doe salary" mentioned but not in sources → flag in confidence
- For missing data: provide intelligent estimate + note it's estimate
  "Team size: 12-15 engineers (estimate from 8 job openings + 4 mentioned on website)"
```

### Output: Complete DD Report (JSON)
```json
{
  "company": {
    "name": "QuantumX",
    "tagline": "Quantum simulation software for drug discovery",
    "website": "quantumx.fr",
    "sector": "Deep Tech / Quantum Computing",
    "stage": "Series A",
    "founded": "2023",
    "headquarters": "Paris, France",
    "employeeCount": "12"
  },
  "executiveSummary": {
    "overview": "QuantumX is a quantum simulation startup...",
    "keyHighlights": [...],
    "keyRisks": [...],
    "recommendation": "INVEST",
    "confidenceLevel": "high"
  },
  "product": {...},
  "market": {...},
  "competition": {...},
  "financials": {...},
  "team": {...},
  "traction": {...},
  "risks": {...},
  "investmentRecommendation": {
    "recommendation": "INVEST",
    "riskLevel": "medium",
    "targetReturn": "50-100x",
    "suggestedTicket": "1.5M EUR"
  }
}
```

---

## PROBLÈMES IDENTIFIÉS & SOLUTIONS

### Problème 1: Scores bas (35-40/100) même avec thèse claire
**Cause**: thesisFit sous-pondéré (30%), ou extraction de thèse imprécise
**Solution**:
- thesisFit augmenté à 45-50% ✓ (déjà fait)
- Améliorer l'extraction de thèse pour être plus PRÉCISE (voir issue)

### Problème 2: DD ne trouve pas l'équipe
**Cause**: Pas assez de requêtes Team-focused (seulement 2-3 sur 30)
**Solution**:
- Ajouter 8-10 requêtes dédiées à l'équipe (LinkedIn, fondateurs, hirings)
- Forcer la section Team dans le prompt Gemini (OBLIGATOIRE)
- Valider que chaque founder a ≥2 sources

### Problème 3: Sections manquantes (Traction, Risks, Competition detail)
**Cause**: Refonte design avait réduit les sections
**Solution**: ✓ Revert à la version complète (1827 lignes)

### Problème 4: Hallucinations d'URL
**Cause**: Gemini invente des URLs qui n'existent pas
**Solution**: 
- Valider toutes les URLs contre searchResults (la liste réelle)
- Si URL non trouvée → laisser vide ou mettre null

---

## Recommandations pour prochaine amélioration

1. **Améliorer l'extraction de thèse** (Gemini 2.5-pro avec temperature 0.0, strict format)
2. **Ajouter 8-10 requêtes Team** au DD search
3. **Valider les URLs** contre les sources réelles trouvées
4. **Augmenter le threshold de viabilité** : de 20 → 35-40/100 (sourcing faible = retry)
5. **Tester avec Supernova Invest réellement** et itérer
6. **Documenter les scores par composant** (pourquoi score bas si thesisFit=72? Bug? Poids mal calibrés?)

---

## Exemple complet: Pipeline Supernova Invest

### Input
```
Fund: "Supernova Invest"
Target: 1 startup in deep tech quantum
```

### ÉTAPE 1: Analyze
→ Output: Thesis with sectors=[quantum, materials], stage=[pre-seed, Series A]

### ÉTAPE 2: Sourcing
→ Finds: QuantumX (score 78), QBit (68), PhotonicLabs (65)

### ÉTAPE 3: Picking
→ Winner: QuantumX (72.8/100)
→ Reason: Strong quantum IP + ex-GAFAM team + funded

### ÉTAPE 4: DD Search
→ 87 results found about QuantumX (funding, team, product, risks)

### ÉTAPE 5: DD Analyze
→ Full report: QuantumX with all 11 sections filled, INVEST recommendation

---

*This document should be updated as the pipeline evolves.*
