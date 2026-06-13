# AI-VC: Outils Gratuits/Essai & Limites

Ce document énumère **tous** les outils externes utilisés par AI-VC (sourcing, due diligence, IA), avec leurs limites, quotas, et contraintes.

---

## 1. RECHERCHE WEB

### 1.1 Brave Search API
**Rôle** : Recherches web principal (sourcing + DD search)
**Endpoint** : `api.search.brave.com/res/v1/web/search`
**Authentification** : API key (BRAVE_API_KEY)

| Aspect | Valeur |
|--------|--------|
| **Plan Free** | ❌ N'existe pas — Brave Search est payant |
| **Plan Essai** | 1 mois, 100 requêtes/jour (gratuit initial) |
| **Coût** | ~$0.001/requête après (très cher) |
| **Limite** | ~3000/mois (limit est stricts) |
| **Latence** | ~500ms par request |
| **Format** | JSON avec snippets (titre, description, URL) |

**Limitations connues** :
- Pas de throttling — rapid-fire requests causent rate-limiting (429)
- Résultats parfois peu pertinents vs Google
- Pas de filtrage par date natif (usar `date:YYYY-MM-DD` dans la query)
- Pas de support pour les recherches booléennes complexes

**Utilisation dans AI-VC** :
```
pipeline-orchestrator: 80 requêtes × 5 résultats = 400 appels par sourcing
due-diligence: ~20-40 requêtes × 5-6 résultats = 100-240 appels par DD
TOTAL/jour: ~3-4 sourcing + 5-10 DD = 1400-3000 requêtes/jour
```

**Gotchas** :
- 🔴 **COÛT ÉLEVÉ** : À 100/mois, on épuise le budget rapidement. Serper (fallback) est recommandé.
- 🟡 **Rate limit 429** : Brave applique un limit de ~10 req/sec ; au-delà → 429 Conflict
- 🟡 **Déduplication** : Les résultats contiennent beaucoup de doublons (annuaires, agrégateurs)

---

### 1.2 Serper API (Google Search)
**Rôle** : Fallback pour Brave Search, recherches prioritaires
**Endpoint** : `google.serper.dev/search`
**Authentification** : API key (SERPER_API_KEY)

| Aspect | Valeur |
|--------|--------|
| **Plan Free** | 100 requêtes/mois (gratuit) |
| **Plan Essai** | Non — Free tier is le seul offert |
| **Coût après** | $20/mois (pour 5000 req) |
| **Quota total** | 100/mois en free |
| **Latence** | ~300ms |
| **Format** | JSON (title, snippet, link, date optionnel) |

**Limitations** :
- 🔴 **Quota très limité** (100/mois) — épuisé en 2-3 sourcing seulement
- 🟡 **Pas de pagination native** — un seul appel = 10 résultats max
- 🟡 **Date filtering est mauvais** — les résultats ne respectent pas toujours `after:YYYY-MM-DD`
- 🟡 **Filtrage par domaine limité** — `site:linkedin.com` fonctionne mais incomplet

**Utilisation dans AI-VC** :
```
Due diligence phase 1:
- 1-2 requêtes Serper par sourcing (si budget disponible)
- Fallback à Brave si Serper épuisé (très probable)
TOTAL: ~100/mois = ~3-4 sourcing, then switch to Brave
```

**Gotchas** :
- 🔴 **Quota extrêmement limité** — impossible à utiliser comme primary
- 🟡 **Meilleure qualité que Brave** (résultats Google réels) — utilise seulement pour queries critiques (équipe, funding)
- 🟡 **Comportement: épuisé rapidement**

---

## 2. SOURCES STRUCTURÉES (Gratuites, pas API)

### 2.1 INSEE SIRENE Registry (France)
**Rôle** : Immatriculations récentes d'entreprises françaises
**Endpoint** : `data.opendatasoft.com` (proxy SIRENE public)
**Authentification** : Aucune (public dataset)

| Aspect | Valeur |
|--------|--------|
| **Quota** | Illimité (données publiques) |
| **Latence** | ~2s per query |
| **Format** | JSON avec raison sociale, NAF code, lieu immatriculation |
| **Update frequency** | Daily (INPI updates) |

**Limitations** :
- 🟡 **Données limitées** — juste raison sociale, NAF, lieu, date immatriculation
- 🟡 **Pas d'URL website** — on doit chercher le site web séparément
- 🟡 **Pas d'info fondateurs** — juste nom société
- 🟡 **Latence ~2s** : Lent comparé à web search

**Utilisation dans AI-VC** :
```
sourcing step: ~20-25 candidates extraits du registre INSEE (pre-seed, stade early)
Filtré par NAF codes (7220Z R&D, 4799B vente spécialisée, etc.)
TOTAL: 20-35 candidats INSEE par sourcing
```

**Gotchas** :
- 🟡 **Nomenclature NAF décalée** — les startups deep tech ont parfois codes génériques (6202Z pour dev)
- 🟡 **Pas de données secteur** — faut parser la raison sociale pour déduire secteur
- 🟡 **Juste le nom = très peu de signal** — nécessite enrichissement web après

---

### 2.2 Hacker News Algolia API
**Rôle** : Détecte "Show HN" (lancements produit early-stage)
**Endpoint** : `hn.algolia.com/api/v1/search`
**Authentification** : Aucune (public API)

| Aspect | Valeur |
|--------|--------|
| **Quota** | Illimité |
| **Latence** | ~300ms |
| **Format** | JSON (title, points, comments, created_at, url) |
| **Coverage** | ~15 ans de HN posts (archive complète) |

**Limitations** :
- 🟡 **Bruit très élevé** — beaucoup de posts non-startup (discussions, questions, jobs)
- 🟡 **Survieillance survivor bias** — les posts populaires (high points) = déjà funded/connus
- 🟡 **Petit volume** — ~20-30 "Show HN" posts/jour, filtré à ~2-3 pour secteur spécifique
- 🟡 **Low signal pour sourcing direct** — plus utile pour confirmer une startup trouvée ailleurs

**Utilisation dans AI-VC** :
```
sourcing: 3 requêtes (secteur + keywords) × max 20 résultats = 60 results
Filtrés à ~3-5 vraies startups après dédup
TOTAL: 3-5 candidates par sourcing
```

**Gotchas** :
- 🟡 **Faux positifs énormes** — "Show HN: comment j'ai fait X" n'est pas une startup
- 🟡 **Pas de metadata** — juste titre + points + commentaires ; faut aller sur le site pour le contexte
- 🟡 **Timing erratique** — les "Show HN" ne reflètent pas quand la startup a lancé réellement

---

### 2.3 GitHub Search API
**Rôle** : Détecte organisations/repos récents (proxy de startups en construction)
**Endpoint** : `api.github.com/search/repositories`
**Authentification** : Optionnel (Bearer token pour ~30 req/min)

| Aspect | Valeur |
|--------|--------|
| **Rate limit (no token)** | 10 requests/min (~600/h) |
| **Rate limit (with token)** | 30 requests/min (~1800/h) |
| **Quota daily (no token)** | ~14,400 req/jour (suffisant) |
| **Latence** | ~500ms |
| **Format** | JSON (owner, repo name, stars, created_at, description) |

**Limitations** :
- 🟡 **Beaucoup de bruit** — "hello-world" repos, tutorials, forks
- 🟡 **Stars ≠ traction** — high-star repos souvent dead projects
- 🟡 **Pas de funding info** — on doit inférer du README (qui manque souvent)
- 🟡 **GitHub users ≠ companies** — difficile distinguer personal project vs startup

**Utilisation dans AI-VC** :
```
sourcing: 2 requêtes (secteur avec tech keywords) × 20 results = 40 results
Filtrés par: >5-10 stars, created <180 jours, description non-vide
TOTAL: 5-10 candidates par sourcing
```

**Gotchas** :
- 🟡 **Nombreux faux positifs** — du code académique, hobbyist projects
- 🟡 **Pas de lien website** — GitHub ≠ entreprise formelle
- 🟡 **Timing flou** — GitHub created_at ≠ fecha de fondation réelle

---

## 3. WEAK SIGNALS (via Brave/Serper, pas d'API directe)

Utilise **site: searches** dans Brave/Serper pour accéder à ces sources (pas de quota dédié, comptent comme requêtes web).

### 3.1 Product Hunt
**Query pattern** : `site:producthunt.com [sector] "launched" [year]`
**Signal** : Lancements de produits tôt
**Limitations** :
- 🟡 Beaucoup de produits ≠ startups (apps mobiles, outils SaaS individuals)
- 🟡 Plateforme US-biased
- 🟡 Makers ≠ véritables founders

---

### 3.2 Wellfound (ex-AngelList)
**Query pattern** : `site:wellfound.com [sector] [geography] "seed"`
**Signal** : Startups en fundraising
**Limitations** :
- 🟡 Juste le titre et description très courte du site
- 🟡 Beaucoup de scams/fake startups
- 🟡 Data souvent stale (profiles non-updated)

---

### 3.3 LinkedIn Company Pages
**Query pattern** : `site:linkedin.com/company [sector]`
**Signal** : Entreprises formées, avec équipe
**Limitations** :
- 🟡 Site: search sur LinkedIn très limité (renvoie que la page d'accueil compagnie)
- 🟡 Pas de liste équipe accessible en search results
- 🟡 Nécessite navigation manuelle pour détails

---

### 3.4 Job Boards (Welcome to the Jungle, Lever, etc.)
**Query pattern** : `site:welcometothejungle.com [sector] "1 offre" OR "2 offres"`
**Signal** : Early hiring = startup en croissance
**Limitations** :
- 🟡 Pas accès à listing détaillé (juste le snippet)
- 🟡 Bruit : beaucoup de faux positifs (cabinets conseil posent aussi annonces)

---

### 3.5 arXiv/HAL (Academic papers = deeptech research)
**Query pattern** : `site:arxiv.org [sector keywords] [author]`
**Signal** : Research publications (founders souvent auteurs)
**Limitations** :
- 🟡 Très spécialisé (deeptech seulement)
- 🟡 Pas d'URL entreprise — nécessite associer auteur → fondateur → startup

---

### 3.6 Google Patents
**Query pattern** : `site:patents.google.com [sector keywords]`
**Signal** : Brevets déposés = IP validée
**Limitations** :
- 🟡 Pas accès au inventeur → entreprise mapping (nécessite parsing manuel)
- 🟡 Beaucoup de brevets non-pertinents (recherches profondes souvent génériques)

---

### 3.7 INPI (Institut National de la Propriété Industrielle) + Espacenet (EPO)
**Query pattern** : `site:espacenet.com [sector] [inventor]`
**Signal** : French + European patents
**Limitations** :
- 🟡 Interface compliquée, peu de data en search results
- 🟡 Nécessite parsing complexe pour associer inventor → startup

---

## 4. IA (LANGUAGE MODELS)

### 4.1 Google Gemini API
**Rôle** : Analyse fund thesis, scoring candidates, DD analysis
**Models** : gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-pro
**Endpoint** : `generativelanguage.googleapis.com/v1beta/models/[model]:generateContent`
**Authentification** : API key (GEMINI_API_KEY, support multi-key rotation)

| Aspect | Valeur |
|--------|--------|
| **Free tier** | 1M tokens/jour ≈ 15,000 requêtes courtes (~30 appels sourcing par jour) |
| **Quota check** | Comptabilisé pour chaque API key — quota partagé entre clés |
| **Rate limit** | 2 requests/sec per key, 900 requests/min global |
| **Token pricing (paid)** | ~$0.004 input / $0.016 output (2.5-flash) |
| **Latence** | ~1-3s pour réponse complete |
| **Context length** | 1M tokens (peut ingérer 50+ pages de texte) |

**Utilisation dans AI-VC** :
```
Analyze Fund: 1 appel × 2000 tokens = 2000
Sourcing (Picking + Scoring): 1 appel batch × 5000 tokens = 5000
DD Analyze: 2-3 appels × (8000 input + 16000 output) = 72,000 tokens
TOTAL par pipeline: ~80,000 tokens ≈ 5-6 requêtes
DAILY: 30-50 sourcing = 400,000-800,000 tokens/jour
```

**Free tier math** :
```
1,000,000 tokens/jour / 80,000 per pipeline = 12-13 analyses/jour max
Après ça = bloqué jusqu'à minuit UTC+1 (Supabase reset daily)
```

**Limitations & Quotas** :
- 🔴 **Free tier très limité** (12-15 pipelines/jour) — pas scaling pour usage productif
- 🔴 **Multi-key rotation obligatoire** — 1 clé = ~12 per jour, 4 clés = ~48 per jour (encore insuffisant)
- 🟡 **Shared quota per key** — si 2 functions utilisent même clé → compétition
- 🟡 **Rate limit 2 req/sec** → avec 5+ functions en paralell, certains hit limit
- 🟡 **Error 429 (quota exceeded)** → pas auto-retry, fonction fails
- 🟡 **Thinking tokens (experimental)** — coûtent 4× plus que tokens normaux

**Gotchas** :
- 🔴 **Budget killer** : À $0.004/1k input, 1 pipeline = $0.32 si paid. 30 pipelines/jour = $10/jour.
- 🟡 **"Model overloaded" (503)** → Gemini peut être surchargé en heures de pointe
- 🟡 **Hallucinations énormes** — Gemini génère des URLs fictives, noms de fondateurs faux, etc. Nécessite validation post-generation.
- 🟡 **Temperature = 0.1** (deterministic) mais toujours quelques variations

**Workarounds** :
```
✅ Multi-key rotation (4 clés Gemini)
✅ Batch scoring (1 appel IA pour 10 candidats au lieu de 10 appels)
✅ Caching avec Supabase (stocke les résultats, réutilise si query identique)
✅ Temperature 0.0 (plus déterministe que 0.1)
✅ Longer thinking (~2-5s added latency) pour meilleure qualité (optionnel)
```

---

## 5. BACKEND & HOSTING

### 5.1 Supabase
**Rôle** : Database (PostgreSQL), auth, edge functions, caching
**Plan Free** :
- ✅ PostgreSQL 500MB
- ✅ 2GB bandwidth/mois
- ✅ Edge functions 500k invocations/mois
- ✅ Auth unlimited users
- ✅ Storage 1GB

**Limitations** :
- 🟡 **500MB database** — suffisant pour cache + metadata, pas pour full data warehouse
- 🟡 **Edge functions quota** : ~16,000 invocations/jour max (free) — pas de scaling horizontal
- 🟡 **No scheduled jobs natively** — utilise pg_cron (custom, pas scalable)
- 🟡 **Connection pooling limited** (20 concurrent) — causes bottlenecks si multi-parallel

**Utilisation dans AI-VC** :
```
Sourcing: cache recherches (7 jours TTL) → économise requêtes Brave
DD: stocke résultats search (3 jours TTL) + rapports finaux
Analytics: pipeline_jobs table pour tracking
STORAGE: ~50-100MB pour cache + jobs après 1 mois
```

---

### 5.2 Vercel
**Rôle** : Frontend hosting + auto-deploy
**Plan Free** :
- ✅ Unlimited deployments
- ✅ SSG/SSR support
- ✅ Auto-scaling (zero to many)
- ✅ Analytics 100k events/mois

**Limitations** :
- 🟡 **Build time ~5-10 min** — acceptable
- 🟡 **Cold starts** — Vite build peut être lent si beaucoup de deps
- 🟡 **No direct env secret management** — utilise Vercel dashboard (UI-only, pas CLI reliable)

---

## 6. SUMMARY: Coût & Quota Total

| Outil | Quota/Jour | Problème |
|-------|-----------|---------|
| **Brave Search** | ~3000 req | 💰 Coût élevé ($0.001/req) — épuise quota $ rapidement |
| **Serper** | 100/mois | 🔴 Trop limité — utile seulement en fallback |
| **Gemini API** | 1M tokens ≈ 12-15 pipelines | 🔴 FREE TIER SATURÉ — multi-key rotation non-scalable |
| **INSEE/HN/GitHub** | Illimité | ✅ Gratuit, pas throttling |
| **Weak signals (site:)** | Via Brave/Serper | ✅ Pas de quota additionnel |
| **Supabase** | 500k edge func invoc | ✅ Suffisant pour usage actuel |
| **Vercel** | Unlimited | ✅ Gratuit, bien scalé |

---

## 7. Bottlenecks Actuels

### 🔴 Cririque: Gemini Quota
**Problem**: Free tier 1M tokens/jour = ~12-15 pipelines max
**Impact**: Impossible de scaler (30+ pipelines/jour bloqués)
**Solution** :
- Option A: Payer Gemini (~$300/mois pour 30 pipelines/jour)
- Option B: Switch à Claude API (même coût, meilleure qualité)
- Option C: Use free tier + queuing (delay pipelines until quota reset)

### 🟡 Important: Brave Search Coût
**Problem**: Brave très cher ($0.001/req, budget rapide épuisé)
**Impact**: 80 req/sourcing = $0.08 par sourcing, 30/jour = $2.4/jour = $72/mois
**Solution**:
- Vérifier si quota payant available
- Réduire requêtes (78 → 40, utiliser meilleur filtering)
- Combiner avec Serper (plus cher mais meilleure qualité pour queries critiques)

### 🟡 Moderate: Serper Quota Limitation
**Problem**: Free tier 100/mois épuisé en 2-3 sourcing
**Impact**: Pas fallback dispo → Brave mandatory
**Solution**:
- Pay for Serper ($20/mois = 5000 req) — bon ROI
- Ou accepter Brave comme primary (expensive)

---

## 8. Recommendations for Scaling

| Tier | Gemini | Brave/Serper | Supabase | Vercel | Monthly Cost |
|------|--------|--------------|----------|--------|--------------|
| **Free** | 12-15 pipe/day | Brave only (expensive) | Free | Free | $50-100 |
| **Growth** | Claude API paid | Serper $20 | Free | Free | $300-400 |
| **Production** | Claude API paid | Serper $50 + Brave | Supabase paid | Pro | $600+ |

**Recommandé pour scaling** :
1. ✅ Switch à Claude API (or similar paid model)
2. ✅ Payer pour Serper ($20-50/mois) — meilleure qualité que Brave
3. ✅ Optimiser requêtes (réduire Brave calls de 80 → 40)
4. ✅ Implémenter queue system (si demand > quota disponible)

---

## Appendix: Token Counting by Function

**Analyze Fund**: ~2,000 tokens input
**Sourcing (Pick + Score 10 candidates)**: ~5,000 tokens
**DD Analyze (search + 2-3 rounds)**: ~40,000 tokens input, ~16,000 output

**Daily estimation** (10 sourcing + 2 DD):
```
10 sourcing × (2,000 + 5,000) = 70,000
2 DD × (40,000 + 16,000) = 112,000
TOTAL: ~180,000 tokens/jour
Free tier 1M / 180,000 = 5-6 jours de usage
```

Donc: **Free tier = ~5-6 jours de usage complet par mois**, puis bloqué.

