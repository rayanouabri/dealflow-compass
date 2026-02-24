# 📘 Guide de Fonctionnement — DealFlow Compass

> **Trame complète de la recherche et de l'analyse**
>
> Ce document décrit le fonctionnement interne de l'outil : comment les données sont collectées, traitées, scorées et présentées à l'utilisateur, depuis la configuration initiale jusqu'au rapport de due diligence final.

---

## 📑 Table des matières

1. [Vue d'ensemble](#1--vue-densemble)
2. [Architecture technique](#2--architecture-technique)
3. [Parcours utilisateur complet](#3--parcours-utilisateur-complet)
4. [Phase 1 — Configuration du sourcing](#4--phase-1--configuration-du-sourcing)
5. [Phase 2 — Recherche multi-sources](#5--phase-2--recherche-multi-sources)
6. [Phase 3 — Scoring et sélection](#6--phase-3--scoring-et-sélection)
7. [Phase 4 — Due Diligence approfondie](#7--phase-4--due-diligence-approfondie)
8. [Phase 5 — Rapport et interaction](#8--phase-5--rapport-et-interaction)
9. [Pipeline automatique (1 clic)](#9--pipeline-automatique-1-clic)
10. [Moteurs internes](#10--moteurs-internes)
11. [Schéma récapitulatif](#11--schéma-récapitulatif)

---

## 1. 🔭 Vue d'ensemble

DealFlow Compass est un outil d'aide à la décision pour investisseurs en capital-risque. Il automatise le processus complet :

```
Thèse d'investissement → Sourcing de startups → Scoring → Sélection → Due Diligence → Recommandation
```

**L'outil répond à 3 questions fondamentales :**

| Question | Fonction |
|:---|:---|
| *"Quelles startups correspondent à ma thèse ?"* | Sourcing multi-sources avec biais français |
| *"Laquelle est la plus prometteuse ?"* | Scoring pondéré sur 7 critères |
| *"Dois-je investir ?"* | Due diligence complète + recommandation INVEST / WATCH / PASS |

---

## 2. 🏗️ Architecture technique

### Stack

| Couche | Technologie |
|:---|:---|
| **Frontend** | React + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | Supabase Edge Functions (Deno) |
| **IA** | Gemini 2.5 Pro (principal) → Groq Llama 3.1-70B (fallback) → Vertex AI |
| **Recherche web** | Serper.dev (Google) + Brave Search |
| **Base de données** | Supabase PostgreSQL |
| **Hébergement** | Vercel (frontend) + Supabase (backend) |

### Edge Functions (backend)

| Fonction | Rôle |
|:---|:---|
| `analyze-fund` | Analyse de fonds + sourcing (4 phases) |
| `due-diligence` | Recherche approfondie + rapport IA (2 phases) |
| `pipeline-orchestrator` | Orchestre le pipeline complet (7 étapes) |
| `ninja-sourcing` | Sourcing alternatif (brevets, RH, spinoffs) |
| `ai-qa` | Chat Q&A interactif sur le rapport |

### Modules partagés (`_shared/`)

| Module | Rôle |
|:---|:---|
| `search-client.ts` | Appels Brave + Serper avec déduplication |
| `ai-client.ts` | Chaîne de fallback IA (Gemini → Groq → Vertex) |
| `scoring-engine.ts` | Scoring pondéré sur 7 critères |
| `dedup-ranker.ts` | Déduplication par URL + classement par diversité |
| `sourcing-queries-fr.ts` | Générateur de requêtes biaisées France |
| `logger.ts` | Logs structurés JSON |

---

## 3. 🚶 Parcours utilisateur complet

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                             │
│                    (Inscription / Connexion)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PAGE CONFIGURATION                            │
│                                                                 │
│  ┌─────────────┐   OU   ┌──────────────────┐                   │
│  │ Nom du fonds│         │ Thèse sur mesure │                   │
│  │ (ex: a16z)  │         │ (secteurs, stage, │                   │
│  │             │         │  géo, ticket...)  │                   │
│  └──────┬──────┘         └────────┬─────────┘                   │
│         │                         │                             │
│         └────────────┬────────────┘                             │
│                      │                                          │
│         + Paramètres d'analyse (nb startups, détail...)         │
│                      │                                          │
│    ┌─────────────────┴────────────────┐                         │
│    │                                  │                         │
│    ▼                                  ▼                         │
│  [Lancer l'analyse]          [Auto-Pick + DD (1 clic)]          │
│  (sourcing seul)             (pipeline complet)                 │
└────┬──────────────────────────────────┬─────────────────────────┘
     │                                  │
     ▼                                  ▼
┌────────────────┐            ┌──────────────────┐
│ ANALYSE 4 PHASES│           │ PIPELINE AUTO    │
│ search_fund     │           │ 7 étapes avec    │
│ search_market   │           │ polling temps    │
│ search_startups │           │ réel             │
│ pick            │           │                  │
└───────┬────────┘            └────────┬─────────┘
        │                              │
        └──────────┬───────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DUE DILIGENCE                               │
│                                                                 │
│  Phase 1 : Recherche web (35-45 requêtes)                       │
│  Phase 2 : Analyse IA → Rapport structuré                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                RAPPORT FINAL                            │    │
│  │  💰 Financements  │  🛠️ Produit  │  📊 Marché          │    │
│  │  👥 Équipe        │  🏆 Traction │  ⚔️ Concurrence     │    │
│  │  ⚠️ Risques       │  💡 Recommandation                  │    │
│  │  📑 Sources       │  🤖 Chat IA                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  → Export Markdown  │  → Q&A interactif                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 📝 Phase 1 — Configuration du sourcing

> **Page : Analyser** (`/analyser`)

L'utilisateur configure sa recherche selon deux modes.

### Mode A — Analyse de fonds VC

L'utilisateur entre le nom d'un fonds (ex: *"Sequoia Capital"*, *"Partech"*, *"Elaia Partners"*).

Le système va :
1. Rechercher la thèse d'investissement du fonds sur le web
2. Extraire automatiquement : secteurs cibles, stade, géographie, ticket moyen
3. Utiliser ces critères pour sourcer des startups correspondantes

**Fonds pré-configurés disponibles :** Andreessen Horowitz, Sequoia Capital, Accel, Y Combinator, Partech, Elaia, Daphni, Serena, etc.

### Mode B — Thèse personnalisée

L'utilisateur définit manuellement sa thèse :

| Champ | Exemple |
|:---|:---|
| **Secteurs** | IA, FinTech, CleanTech, HealthTech, DeepTech... (18 options) |
| **Stade** | Pre-Seed, Seed, Series A, Series B, Series C+ |
| **Géographie** | Europe, France, Amérique du Nord, Global... |
| **Taille de ticket** | $0-500K, $500K-2M, $2M-10M, $10M-50M, $50M+ |
| **Description** | Texte libre décrivant la thèse |
| **Critères spécifiques** | Contraintes particulières |
| **Instructions de sourcing** | Directives pour orienter la recherche |

### Paramètres d'analyse avancés

| Paramètre | Valeurs | Défaut |
|:---|:---|:---|
| Nombre de startups | 1 à 5 | 3 |
| Inclure concurrents | Oui / Non | Oui |
| Taille de marché | Oui / Non | Oui |
| Financials détaillés | Oui / Non | Non |
| Analyse du moat | Oui / Non | Non |
| Niveau de détail | 30% à 100% | 70% |
| Nombre de slides | 6 à 15 | 7 |

---

## 5. 🔍 Phase 2 — Recherche multi-sources

> **Edge Function : `analyze-fund`** (phases `search_fund`, `search_market`, `search_startups`)

La recherche se déroule en 3 sous-phases séquentielles.

### Sous-phase 2a — Analyse du fonds (`search_fund`)

**Objectif :** Comprendre la thèse d'investissement du fonds.

**Requêtes web exécutées :**
- `"{nom du fonds}" investment thesis criteria sectors stage geography ticket size`
- `"{nom du fonds}" portfolio companies investments 2023 2024`
- `"{nom du fonds}" team partners investors`

**Résultat :** Extraction de la thèse sous forme structurée (secteurs, stade, géo, critères quantitatifs/qualitatifs, red lines, signaux d'excitation).

### Sous-phase 2b — Analyse de marché (`search_market`)

**Objectif :** Collecter des données sur le marché cible.

**Requêtes web exécutées :**
- `"{secteur}" market size TAM SAM {année} billion growth rate CAGR`
- `"{secteur}" market report {géographie} {année} industry analysis`

**Résultat :** Contexte marché (TAM/SAM/SOM, CAGR, tendances).

### Sous-phase 2c — Sourcing de startups (`search_startups`)

**Objectif :** Identifier des startups correspondant à la thèse.

**Stratégie de recherche — 8 catégories de requêtes (biais français) :**

| # | Catégorie | Exemples de requêtes |
|:---|:---|:---|
| 1 | 🇫🇷 **French Tech** | `LaFrenchTech {secteur} startup`, `Next40 FT120 {secteur}` |
| 2 | 🏦 **Bpifrance** | `Bpifrance i-Nov i-Lab {secteur}`, `French Tech Seed {secteur}` |
| 3 | 🏢 **Incubateurs FR** | `Station F {secteur} startup`, `Agoranov WILCO {secteur}` |
| 4 | 🎓 **Universités / Labs** | `CNRS CEA INRIA spinoff {secteur}`, `thèse CIFRE {secteur}` |
| 5 | 🇪🇺 **Grants EU** | `EIC Accelerator {secteur}`, `Horizon Europe {secteur}` |
| 6 | 👤 **Signaux talent** | `LinkedIn hiring CTO {secteur}`, `alumni HEC Polytechnique {secteur}` |
| 7 | 📰 **Presse FR** | `site:maddyness.com {secteur}`, `site:frenchweb.fr {secteur}` |
| 8 | 📄 **Brevets FR** | `INPI brevet {secteur}`, `EPO patent {secteur} France` |
| 9 | 🌍 **Global** *(optionnel)* | `Y Combinator {secteur}`, `Techstars {secteur}`, `Product Hunt {secteur}` |

**Volume :** Jusqu'à **70 requêtes** exécutées en parallèle par batches de 5.

**Moteurs de recherche utilisés :**
- **Serper.dev** (résultats Google) — prioritaire, 2500 requêtes/mois gratuites
- **Brave Search** — fallback, 2000 requêtes/mois

**Après la collecte :**
1. Déduplication par URL normalisée (suppression `www.`, trailing `/`)
2. Regroupement par domaine (ex: `acme.com/team` + `acme.com/blog` = 1 candidat)
3. Classement par score : `diversité des catégories × nombre de mentions`

---

## 6. 🏆 Phase 3 — Scoring et sélection

> **Edge Function : `analyze-fund`** (phase `pick`) ou **`pipeline-orchestrator`** (étape scoring)

### Scoring pondéré sur 7 critères

Chaque startup candidate est évaluée par l'IA sur 7 axes (note de 0 à 100) :

| Critère | Poids | Description |
|:---|:---:|:---|
| 🎯 **Alignement thèse** | **30%** | Correspondance secteur, stade, géographie, ticket |
| 📊 **Diversité des signaux** | **15%** | Variété des sources (presse, brevets, RH, fonds...) |
| 🇫🇷 **Écosystème français** | **15%** | Présence dans l'écosystème FR (French Tech, Bpifrance, labs...) |
| 👥 **Qualité de l'équipe** | **12%** | Profils fondateurs, expérience, complémentarité |
| 🔗 **Corroboration multi-sources** | **10%** | Même info confirmée par plusieurs sources indépendantes |
| ⏰ **Timing / Momentum** | **10%** | Signaux récents (levée, recrutement, lancement) |
| 🛡️ **Position concurrentielle** | **8%** | Moat, différenciation, avantage compétitif |

**Formule du score final :**

```
Score = Σ (score_critère × poids) → arrondi à l'entier (0-100)
```

**Exemple :**
```
Startup "DeepTechCo" :
  Thèse     = 85 × 0.30 = 25.5
  Diversité = 70 × 0.15 = 10.5
  FR        = 90 × 0.15 = 13.5
  Équipe    = 75 × 0.12 =  9.0
  Sources   = 60 × 0.10 =  6.0
  Timing    = 80 × 0.10 =  8.0
  Moat      = 65 × 0.08 =  5.2
  ─────────────────────────
  TOTAL              = 77.7 → 78/100
```

### Processus de sélection

1. Les **top 10 candidats** (par score de diversité) sont retenus
2. Chaque candidat reçoit un **prompt de scoring** envoyé à l'IA
3. L'IA retourne pour chacun :
   - 7 scores (0-100)
   - Red flags identifiés
   - "Why now" — pourquoi cette startup maintenant
   - "Why this" — pourquoi cette startup spécifiquement
   - Comparables (startups similaires)
   - Niveau de risque (Low / Medium / High)
4. Le score pondéré est calculé
5. La startup avec le **score le plus élevé** est sélectionnée pour la due diligence

---

## 7. 🔬 Phase 4 — Due Diligence approfondie

> **Edge Function : `due-diligence`** (2 phases)
>
> **Page : DueDiligenceResult** (`/due-diligence/result`)

### Entrées

| Champ | Obligatoire | Source |
|:---|:---:|:---|
| Nom de l'entreprise | ✅ | Sélection automatique ou saisie manuelle |
| Site web | ❌ | Enrichit la recherche |
| Contexte additionnel | ❌ | Ex: "startup IA française, levée récente" |

### Phase 4a — Recherche web massive (`phase: "search"`)

**Durée :** ~30-60 secondes | **Timeout :** 160 secondes

**35 à 45 requêtes** ciblées couvrant tous les angles :

| Angle de recherche | Exemples de requêtes |
|:---|:---|
| **Identité** | `"{nom}" company overview about`, `"{nom}" startup official website` |
| **Financements** | `"{nom}" funding round investment 2024 2025`, `"{nom}" series A B C valuation` |
| **Métriques** | `"{nom}" revenue ARR MRR metrics`, `"{nom}" customers growth` |
| **Équipe** | `"{nom}" founders CEO CTO team LinkedIn`, `"{nom}" leadership background` |
| **Produit** | `"{nom}" product technology platform`, `"{nom}" patents` |
| **Marché** | `"{nom}" competitors market landscape`, `"{nom}" TAM SAM industry` |
| **Actualités** | `"{nom}" news latest 2024 2025`, `"{nom}" press release` |
| **Profils** | `"{nom}" LinkedIn company page`, `"{nom}" Crunchbase profile` |
| **Récompenses** | `"{nom}" awards prizes recognition` |
| **Risques** | `"{nom}" challenges risks concerns`, `"{nom}" reviews reputation` |

**Exécution :** Batches de 3 requêtes en parallèle, 650ms entre chaque batch.

**Post-traitement :**
1. Déduplication par URL
2. Catégorisation automatique (funding, metrics, team, product, market, news, linkedin, crunchbase, official, other)
3. Stockage du contexte en base de données (table `due_diligence_jobs`)
4. Retourne un `jobId` pour la phase suivante

### Phase 4b — Analyse IA (`phase: "analyze"`)

**Durée :** ~30-90 secondes | **Timeout :** 200 secondes

**Processus :**

```
1. Charger le contexte de recherche (depuis la BDD via jobId)
        │
        ▼
2. Détection de lacunes (Gap Detection Round 1)
   → L'IA identifie 2-4 thèmes avec données insuffisantes
   → Génère 4-8 requêtes web complémentaires
   → Exécute ces requêtes → enrichit le contexte
        │
        ▼
3. Appel IA principal (Gemini 2.5 Pro)
   → Température : 0.1 (très factuel)
   → Max tokens : 32 768
   → Prompt : analyste VC senior 20 ans d'expérience
   → Output : JSON structuré (12 sections)
        │
        ▼
4. Post-traitement
   → Extraction des sources inline → migration vers allSources
   → Nettoyage du texte (suppression des "(Source: ...)")
   → Validation et nettoyage des URLs
   → Normalisation des types (milestones, partnerships, awards → chaînes)
        │
        ▼
5. Détection de lacunes (Gap Detection Round 2)
   → L'IA analyse le rapport brouillon
   → Identifie 1-3 thèmes manquants
   → Recherches complémentaires
   → Fusion avec le rapport existant
        │
        ▼
6. Rapport final sauvegardé en BDD
```

**Modèle IA utilisé :**
- **Gemini 2.5 Pro** (Google) — principal
- **Vertex AI** — alternative (même modèle, authentification différente)
- Température : **0.1** (réponses très précises et factuelles)
- Max tokens : **32 768** (rapports longs et détaillés)

---

## 8. 📊 Phase 5 — Rapport et interaction

> **Page : DueDiligenceResult** (`/due-diligence/result`)

### Structure du rapport final

Le rapport est organisé en **10 onglets** :

#### 💰 Onglet 1 — Financements
- Historique des levées (round, montant, date, investisseurs)
- Financement total cumulé
- Dernière valorisation connue
- Métriques financières (ARR, MRR, croissance, burn rate...)

#### 🛠️ Onglet 2 — Produit & Technologie
- Description du produit
- Proposition de valeur
- Stack technologique
- Brevets déposés
- Fonctionnalités clés

#### 📊 Onglet 3 — Marché
- TAM / SAM / SOM (avec chiffres)
- CAGR du marché
- Tendances identifiées
- Analyse complète du marché

#### 👥 Onglet 4 — Équipe
- Vue d'ensemble de l'équipe
- Profil de chaque fondateur (nom, rôle, parcours, LinkedIn)
- Dirigeants clés
- Taille de l'équipe
- Culture d'entreprise
- Tendances de recrutement

#### 🏆 Onglet 5 — Traction
- Vue d'ensemble de la traction
- Nombre de clients + clients notables
- Segments de marché
- Jalons clés (timeline)
- Partenariats
- Prix et récompenses

#### ⚔️ Onglet 6 — Concurrence
- Paysage concurrentiel
- Liste des concurrents (avec financement et description)
- Avantage concurrentiel
- Analyse du moat

#### ⚠️ Onglet 7 — Risques
- Risques de marché
- Risques d'exécution
- Risques financiers
- Risques concurrentiels
- Risques réglementaires
- Mesures d'atténuation
- Niveau de risque global

#### 💡 Onglet 8 — Recommandation d'investissement
- **Verdict : 🟢 INVEST / 🟡 WATCH / 🔴 PASS**
- Raisonnement détaillé
- Forces et faiblesses
- Questions clés à poser
- Prochaines étapes suggérées
- Rendement cible, horizon d'investissement, ticket suggéré

#### 📑 Onglet 9 — Sources
- 15 à 25+ sources vérifiées
- Chaque source : nom, URL, type, pertinence
- Agrégation de toutes les sections

#### 🤖 Onglet 10 — Assistant IA (Q&A)
- Chat interactif pour poser des questions sur le rapport
- Recherches web complémentaires en temps réel
- Réponses sourcées (5-10 sources minimum)
- Historique de conversation préservé

### Export

Le rapport complet est exportable en **Markdown** (`.md`) avec :
- Table des matières
- Tableaux formatés (financements, marché, équipe)
- Emojis de section
- Sources numérotées
- Badge de recommandation (🟢/🟡/🔴)

---

## 9. 🚀 Pipeline automatique (1 clic)

> **Edge Function : `pipeline-orchestrator`**
>
> **Page : PipelineProgress** (`/pipeline`)

Le bouton **"Auto-Pick + Due Diligence (1 clic)"** exécute le pipeline complet sans intervention.

### Machine à états (7 étapes)

```
┌─────────────────┐
│ 1. thesis_       │  Analyse de la thèse d'investissement
│    analyzing     │  → Extraction : secteurs, stade, géo, critères
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. sourcing_     │  Sourcing multi-sources (FR + Global)
│    running       │  → 70 requêtes Brave/Serper
│                  │  → Déduplication + ranking
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. picking       │  Scoring des top 10 candidats
│                  │  → 7 critères pondérés
│                  │  → Sélection du meilleur match
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. dd_search_    │  Recherche DD (35-45 requêtes)
│    running       │  → Phase "search" de due-diligence
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. dd_analyze_   │  Analyse IA complète
│    running       │  → Phase "analyze" de due-diligence
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. dd_done       │  ✅ Pipeline terminé
│                  │  → Redirection auto vers le rapport
└─────────────────┘
```

### Mécanisme interne

- **Pattern :** Self-invocation (la fonction s'appelle elle-même pour chaque étape)
- **Polling :** Le frontend interroge le statut toutes les **3 secondes**
- **Retry :** Backoff exponentiel (2^n × 1000ms) en cas d'échec, max 3 retries
- **Affichage :** Barre de progression + carte de la startup sélectionnée en temps réel

### Coût estimé par exécution

| Composant | Coût |
|:---|:---|
| Requêtes Brave/Serper (~70) | ~$0.07 |
| Appels IA (scoring + analyse) | ~$0.10 |
| **Total estimé** | **~$0.18** |

---

## 10. ⚙️ Moteurs internes

### 10.1 — Moteur de recherche (`search-client.ts`)

```
Requête utilisateur
       │
       ├──→ Serper.dev (POST google.serper.dev/search)
       │    └─ Résultats Google : title, url, snippet
       │
       └──→ Brave Search (GET api.search.brave.com)
            └─ Résultats Brave : title, url, description, extra_snippets
       │
       ▼
  Déduplication par URL → Résultats fusionnés
```

**Rate limiting :** Retry automatique avec backoff exponentiel sur HTTP 429.

### 10.2 — Moteur de déduplication (`dedup-ranker.ts`)

```
Résultats bruts (centaines d'URLs)
       │
       ▼
  1. Normalisation URL (lowercase, sans www., sans trailing /)
  2. Regroupement par domaine
  3. Accumulation : mentions, catégories, descriptions
  4. Score = catégories.size × mentionCount
  5. Tri décroissant par score
       │
       ▼
  Candidats classés (top N)
```

### 10.3 — Moteur IA (`ai-client.ts`)

**Chaîne de fallback :**

```
        ┌──────────┐     échec     ┌──────────┐     échec     ┌──────────┐
        │  Gemini  │ ──────────→  │   Groq   │ ──────────→  │  Vertex  │
        │ 2.5 Pro  │              │ Llama 70B│              │  AI      │
        └──────────┘              └──────────┘              └──────────┘
              │                         │                         │
              ▼                         ▼                         ▼
         JSON mode               JSON mode                  JSON mode
```

**Chaque appel :**
1. Essai avec `jsonMode: true`
2. Si réponse vide → skip
3. Si parsing JSON échoue → retry après 500ms
4. Si provider échoue → provider suivant dans la chaîne

### 10.4 — Moteur de scoring (`scoring-engine.ts`)

**Entrée :** Profil startup + thèse d'investissement

**Prompt IA :** Analyste VC senior évalue 7 critères (0-100 chacun)

**Sortie :**
```json
{
  "scores": {
    "thesisFit": 85,
    "signalDiversity": 70,
    "frenchEcosystem": 90,
    "teamQuality": 75,
    "sourceCorroboration": 60,
    "timing": 80,
    "competitivePosition": 65
  },
  "redFlags": ["Marché très concurrentiel"],
  "whyNow": "Levée de fonds récente + recrutement massif",
  "whyThisStartup": "Seul acteur deep tech en France sur ce créneau",
  "comparables": ["Startup A (UK)", "Startup B (US)"],
  "riskLevel": "Medium"
}
```

### 10.5 — Sourcing alternatif (`ninja-sourcing`)

Méthodes non conventionnelles exécutées **en parallèle** :

| Méthode | Signal détecté |
|:---|:---|
| 🎯 **Signaux talent** | Entreprises recrutant des postes critiques (CTO, Head of AI, VP Eng) |
| 📄 **Brevets / IP** | Dépôts de brevets récents, citations par des géants tech |
| 🎓 **Spinoffs universitaires** | Essaimages CNRS, CEA, INRIA, MIT, Stanford |
| 🔄 **Lookalike vectoriel** | Entreprises similaires à une référence donnée |

### 10.6 — Chat Q&A (`ai-qa`)

**Fonctionnement :**
1. L'utilisateur pose une question sur le rapport
2. Le système construit un contexte riche (données startup + rapport DD + thèse)
3. **4 recherches web ciblées** sont effectuées selon l'intention de la question
4. L'IA génère une réponse avec **5-10 sources minimum**
5. Les URLs sont validées et le markdown est nettoyé
6. L'historique de conversation est préservé en session

---

## 11. 🗺️ Schéma récapitulatif

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      DEALFLOW COMPASS                                ║
║                   Trame de recherche & analyse                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ENTRÉE                                                               ║
║  ══════                                                               ║
║  Nom du fonds VC    ──┐                                               ║
║          OU            ├──→ Thèse d'investissement structurée         ║
║  Thèse sur mesure   ──┘    (secteurs, stade, géo, ticket, critères)  ║
║                                                                       ║
║  RECHERCHE (Phase 2)                                                  ║
║  ═══════════════════                                                  ║
║  ┌─────────────────────────────────────────────────────────┐         ║
║  │  70 requêtes web  ─→  Serper (Google) + Brave Search    │         ║
║  │                                                          │         ║
║  │  8 catégories :                                          │         ║
║  │  🇫🇷 French Tech │ 🏦 Bpifrance │ 🏢 Incubateurs        │         ║
║  │  🎓 Universités  │ 🇪🇺 EU Grants │ 👤 Talent signals     │         ║
║  │  📰 Presse FR    │ 📄 Brevets FR │ 🌍 Global (optionnel) │         ║
║  └──────────────────────────┬──────────────────────────────┘         ║
║                              │                                        ║
║                              ▼                                        ║
║  SCORING (Phase 3)           Déduplication + Ranking                  ║
║  ═════════════════           (URL normalization, domain grouping)     ║
║                              │                                        ║
║                              ▼                                        ║
║  ┌─────────────────────────────────────────────────────────┐         ║
║  │  Top 10 candidats évalués par IA sur 7 critères :       │         ║
║  │                                                          │         ║
║  │  🎯 Thèse (30%)  │ 📊 Diversité (15%) │ 🇫🇷 FR (15%)   │         ║
║  │  👥 Équipe (12%) │ 🔗 Sources (10%)   │ ⏰ Timing (10%) │         ║
║  │  🛡️ Moat (8%)                                            │         ║
║  │                                                          │         ║
║  │  Score final = Σ (note × poids)  →  0 à 100             │         ║
║  └──────────────────────────┬──────────────────────────────┘         ║
║                              │                                        ║
║                              ▼  Meilleur score sélectionné            ║
║                                                                       ║
║  DUE DILIGENCE (Phase 4)                                              ║
║  ═══════════════════════                                              ║
║  ┌─────────────────────────────────────────────────────────┐         ║
║  │  Phase Search : 35-45 requêtes ciblées                   │         ║
║  │  → identité, financement, équipe, produit, marché,       │         ║
║  │    concurrence, actualités, brevets, risques              │         ║
║  │                                                          │         ║
║  │  Phase Analyze : Gemini 2.5 Pro (température 0.1)        │         ║
║  │  → 2 rounds de gap detection + enrichissement            │         ║
║  │  → Rapport structuré JSON (12 sections)                  │         ║
║  └──────────────────────────┬──────────────────────────────┘         ║
║                              │                                        ║
║                              ▼                                        ║
║  SORTIE                                                               ║
║  ══════                                                               ║
║  ┌─────────────────────────────────────────────────────────┐         ║
║  │  📋 RAPPORT DE DUE DILIGENCE                             │         ║
║  │                                                          │         ║
║  │  💰 Financements    │  🛠️ Produit     │  📊 Marché       │         ║
║  │  👥 Équipe          │  🏆 Traction    │  ⚔️ Concurrence  │         ║
║  │  ⚠️ Risques         │  💡 Recommandation                 │         ║
║  │  📑 Sources (15-25) │  🤖 Chat IA Q&A                    │         ║
║  │                                                          │         ║
║  │  Verdict : 🟢 INVEST  │  🟡 WATCH  │  🔴 PASS            │         ║
║  │                                                          │         ║
║  │  → Export Markdown                                       │         ║
║  └─────────────────────────────────────────────────────────┘         ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 📝 Notes complémentaires

### Gestion des timeouts

L'architecture en 2 phases (search → analyze) contourne la limite de 150 secondes des Edge Functions Supabase :
- Chaque phase reste sous 150 secondes
- Le contexte de recherche est stocké en BDD entre les phases
- Le frontend enchaîne les phases séquentiellement

### Crédits d'essai

- Chaque nouvel utilisateur reçoit **3 crédits gratuits**
- 1 crédit = 1 analyse complète (sourcing + DD)
- Le système vérifie les crédits avant chaque action

### Persistance

- Le `sessionStorage` du navigateur est utilisé comme filet de sécurité
- Si la page est rechargée en cours d'analyse, les données sont récupérées
- Les résultats sont également sauvegardés en base de données

### Sécurité

- Accès aux données via Supabase Row Level Security (RLS)
- Les Edge Functions utilisent `service_role` (BYPASSRLS) pour les opérations internes
- Les clés API (Brave, Serper, Gemini) sont stockées en secrets Supabase

---

*Document généré le 24 février 2026 — DealFlow Compass v1.0*
