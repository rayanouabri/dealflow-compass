# Guide complet — comment marche le logiciel, de zéro

Ce document explique **tout** le fonctionnement de l'application, en partant du
principe que tu ne connais **ni le logiciel ni le vocabulaire technique**. On
commence par les mots, puis le voyage d'une analyse, puis chaque étape en détail
(y compris **comment on parle à l'IA Gemini** et **quelles recherches** sont
lancées).

Mise à jour : 2026-06-15.

---

## 0. En une phrase

Un fonds d'investissement (VC) saisit ses **critères** (secteurs, stades,
géographie, thèse en texte libre). Le logiciel va **chercher tout seul** une
startup discrète et vraiment alignée, puis rédige un **rapport d'analyse
d'investissement** (due diligence) de niveau professionnel.

**Mission centrale = anti-biais** : remonter des **pépites early-stage peu
connues**, jamais les noms célèbres (licornes, Mistral…) ni les coquilles vides
de registre du commerce.

---

## 1. Le vocabulaire (à lire en premier)

- **VC (Venture Capital)** : fonds qui investit dans des startups jeunes à fort
  potentiel. **Thèse** = la stratégie du fonds (quels secteurs/stades/géo il vise).
  **ICP** (Ideal Customer Profile, ici "Ideal Company Profile") = le portrait-robot
  de la startup idéale pour ce fonds.
- **Stade (stage)** : niveau de maturité/financement d'une startup. Du plus jeune
  au plus mûr : *pre-seed → seed → série A → série B → série C…*. "Early-stage" =
  les premiers stades (pre-seed à série A/B).
- **Due diligence (DD)** : l'enquête approfondie qu'un investisseur mène avant
  d'investir (équipe, marché, techno, finances, risques).
- **Sourcing** : l'étape qui consiste à **trouver** des startups candidates.
- **Pipeline** : une **chaîne d'étapes automatiques** qui s'enchaînent (ici :
  thèse → sourcing → sélection → recherche DD → rédaction DD). Rien à voir avec la
  plomberie : c'est juste "une suite d'étapes qui se passent le relais".

### Côté technique

- **Frontend** : la partie visible dans le navigateur (les pages web, les boutons).
  Ici en **React** (une techno pour construire des interfaces), hébergée sur
  **Vercel** (un hébergeur de sites). Adresse : `ai-vc-sourcing.vercel.app`.
- **Backend** : la partie invisible qui fait le travail lourd (chercher, appeler
  l'IA, stocker). Ici sur **Supabase**.
- **Serveur** : un ordinateur distant qui exécute du code à la demande.
- **API** : une "prise" standardisée pour qu'un programme en appelle un autre. Quand
  le frontend veut lancer une analyse, il **appelle une API** du backend.
- **Edge Function (Supabase)** : un petit programme backend qui se déclenche quand on
  l'appelle, tourne quelques secondes, répond, puis s'éteint. "Edge" = exécuté sur des
  serveurs proches de l'utilisateur. Elles sont écrites en **Deno** (un environnement
  pour exécuter du JavaScript/TypeScript côté serveur, cousin de Node.js). Nos 3
  fonctions : `pipeline-orchestrator` (le moteur), `due-diligence` (le rapport),
  `ai-qa` (le chat sur le rapport).
- **Wall-time / timeout** : le **temps maximum** qu'une edge function a le droit de
  tourner (~150 secondes chez Supabase). Au-delà, elle est **coupée** de force. C'est
  une contrainte centrale : tout le pipeline est découpé pour rester sous cette limite
  (voir §4, le "chaînage").
- **Base de données / Postgres** : l'endroit où on **stocke** les données de façon
  durable. **Postgres** est le moteur de base de données utilisé. Les données sont
  rangées en **tables** (comme des feuilles Excel) : chaque **ligne** = un
  enregistrement, chaque **colonne** = un champ.
- **RLS (Row-Level Security)** : règle de sécurité de la base qui dit "chaque
  utilisateur ne voit que SES lignes". Empêche un user de lire les données d'un autre.
- **JWT (JSON Web Token)** : un **jeton** signé qui prouve "qui tu es" à chaque appel
  d'API. Deux types ici : la **clé anon** (publique, droits limités, côté navigateur)
  et la **clé service-role** (toute-puissante, jamais exposée, réservée au serveur).
- **Cron / cron job** : un **minuteur automatique** côté serveur qui exécute une tâche
  à intervalle régulier (ex : "toutes les minutes"). Ici, un cron réveille le pipeline
  pour relancer les analyses bloquées (le "watchdog", §4).
- **"Node"** : attention, le mot a deux sens. (1) **Node.js** = un environnement
  d'exécution JavaScript. (2) Un **"nœud"/étape** dans un pipeline = un maillon de la
  chaîne. Dans ce doc, quand on parle des "étapes" du pipeline, ce sont des nœuds
  logiques, pas du code Node.js.
- **Polling** : le frontend qui **redemande régulièrement** "c'est fini ?" au backend
  (ici toutes les 3 secondes) pour afficher l'avancement. (À l'inverse, un *webhook*
  serait le backend qui rappelle le frontend ; on n'en utilise pas.)
- **Cache** : une **mémoire temporaire** des résultats déjà calculés, pour ne pas
  refaire (et repayer) deux fois le même travail. **TTL (Time To Live)** = la durée de
  validité d'une entrée de cache (ex : 14 jours) avant qu'elle expire.
- **Scraping / SERP** : récupérer automatiquement le contenu de pages web. **SERP**
  (Search Engine Results Page) = la page de résultats d'un moteur de recherche. On ne
  scrape pas Google nous-mêmes (il bloque) : on passe par des prestataires —
  **Oxylabs** et **Apify** — qui nous renvoient les résultats Google proprement.
- **LLM / Gemini** : un **grand modèle de langage** (Large Language Model) = une IA qui
  comprend et génère du texte. On utilise **Gemini** (de Google), modèle
  `gemini-3.5-flash`. **Prompt** = le texte d'instructions qu'on envoie à l'IA.
  **Token** = un morceau de mot (l'IA compte en tokens, pas en caractères ; ~1 token
  ≈ 4 caractères). **Température** = le niveau d'aléatoire de l'IA (0 = très
  déterministe, 1 = créatif). **JSON mode** = on force l'IA à répondre dans un format
  structuré (JSON) lisible par le code. **Thinking** = certains modèles "réfléchissent"
  avant de répondre, en consommant des tokens ; on le **désactive** ici pour garder
  tout le budget de sortie au rapport.
- **Clé API / rotation / quota / free tier** : pour appeler Gemini il faut une **clé
  API** (un mot de passe). Chaque clé a un **quota** (nb d'appels/jour) ; le **free
  tier** est la version gratuite. On a **9 clés** et on **tourne** (rotation) entre
  elles pour multiplier le quota et répartir la charge.
- **JSON** : un format texte structuré (des `{ "clé": "valeur" }`) que le code lit
  facilement. Le rapport DD est un gros objet JSON.

---

## 2. Le voyage d'une analyse (vue d'ensemble)

```
 (1) L'utilisateur coche ses critères sur le site
        │
        ▼
 (2) Le frontend appelle l'API "start" → un "job" (tâche) est créé en base
        │
        ▼
 (3) pipeline-orchestrator enchaîne 5 étapes :
        Thèse → Sourcing → Sélection → DD Search → DD Analyse
        │            (chaque étape se relance elle-même, voir §4)
        ▼
 (4) Le frontend "poll" l'avancement toutes les 3s et affiche le pick + la shortlist
        │
        ▼
 (5) L'utilisateur ouvre le rapport de due diligence (déjà calculé et stocké)
        et peut l'exporter en PDF.
```

---

## 3. L'architecture (les briques et qui parle à qui)

```
┌─────────────────────────────────────────────────────────────────┐
│  NAVIGATEUR (l'utilisateur)                                       │
│  Site React hébergé sur Vercel — ai-vc-sourcing.vercel.app        │
└───────────────┬───────────────────────────────────────────────────┘
                │  appels API (HTTPS) avec un jeton JWT
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE (le backend)                                            │
│  • Edge Functions (Deno) :                                        │
│      - pipeline-orchestrator  (le moteur : 5 étapes)              │
│      - due-diligence          (le rapport, 2 phases)              │
│      - ai-qa                  (chat sur un rapport)               │
│  • Postgres (les tables : pipeline_jobs, search_cache, …)         │
│  • Cron (minuteur) → réveille le pipeline (watchdog)              │
└───────────────┬───────────────────────────────────────────────────┘
                │  appels vers l'extérieur
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVICES EXTERNES                                                │
│  • Gemini (Google)  → l'IA qui réfléchit/rédige (9 clés)          │
│  • Oxylabs + Apify  → recherche web Google (scraping propre)      │
│  • Dealroom         → base de startups (gratuit, sans clé)        │
│  • INSEE SIRENE     → immatriculations d'entreprises FR           │
│  • Hacker News, GitHub → signaux produit/tech                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Le pipeline étape par étape (le cœur du logiciel)

### 4.0 Le déclenchement et le "chaînage"

Quand l'utilisateur clique "Lancer une analyse", le frontend appelle
`pipeline-orchestrator` avec `action:"start"` et les critères. Le moteur crée une
ligne dans la table **`pipeline_jobs`** (un "job") avec un statut de départ
(`thesis_analyzing`) et renvoie un **identifiant de pipeline** (`pipelineId`).

**Le problème du temps (très important).** Une edge function est coupée au bout de
~150 secondes. Or une analyse complète prend 2 à 4 minutes. Solution : on **découpe**
le travail en étapes courtes, et **chaque étape se rappelle elle-même** à la fin pour
lancer la suivante. C'est le **chaînage par self-invocation** : la fonction se
re-déclenche avec `action:"continue"` (réservé au serveur, via la clé service-role).
Ainsi aucune étape ne dépasse la limite.

**Et si une étape "meurt" en silence ?** (le serveur peut tuer une fonction sans
prévenir). Deux filets de sécurité :
- **Watchdog** (`selfHealIfStuck`) : à chaque fois que le frontend demande
  l'avancement (poll), on vérifie si le job est figé trop longtemps à une étape ; si
  oui, on le relance (en comptant les essais, max 3).
- **Cron sweep** : un **minuteur** tourne **toutes les minutes** côté base et relance
  les jobs bloqués, même si personne ne regarde l'écran. Si un job dépasse un plafond
  dur (10 min) il est marqué en erreur avec une **alerte** (log ERROR).

Le statut du job avance ainsi :
`thesis_analyzing → thesis_done → sourcing_running → sourcing_done → picking →
pick_done → dd_search_running → dd_search_done → dd_analyze_running → dd_done`.

---

### 4.1 Étape 1 — Structuration de la thèse (1 appel Gemini)

**But** : transformer les critères bruts de l'utilisateur en une **stratégie de
recherche** exploitable par la machine. Aucune recherche web ici (on garde le budget
pour le sourcing).

**Comment on parle à Gemini** : on envoie un **prompt** (instructions) qui dit en
substance : *"Voici les critères de l'utilisateur (ils font autorité, ne les
contredis pas). Déduis-en : l'ICP (portrait de la boîte idéale), les mots-clés
obligatoires (`mustHaveKeywords`), les mots-clés d'exclusion (`exclusionKeywords`),
le stade min/max, et une liste de requêtes de recherche prioritaires
(`priorityQueries`). Réponds en JSON."* Si l'utilisateur a déjà "aimé" des startups
(pouce haut, voir §8), on les ajoute en **exemples** pour orienter le goût.

**Sortie** : un objet JSON (la "thèse structurée") stocké sur le job. **Cache 7
jours** : si on relance avec les mêmes critères, on ne re-paie pas cet appel.

---

### 4.2 Étape 2 — Sourcing multi-source (trouver les candidates)

C'est le cœur anti-biais. On interroge **plusieurs sources en parallèle** :

| Source | Ce qu'elle apporte |
|--------|--------------------|
| **Oxylabs (Google SERP)** | la recherche web principale (~50 requêtes). Google n'est plus bloqué sur le compte actuel → on a la couverture Google directe. |
| **Apify (Google Search)** | une 2ᵉ source Google + des requêtes "fraîches/early" ciblées : `site:stationf.co`, lauréats French Tech/Bpifrance, `site:pappers.fr "augmentation de capital"`, pages LinkedIn société. |
| **Dealroom** (gratuit, sans clé) | `just-founded` (startups tout juste fondées) **et** `marketmaps` (listes curées par tag : "Deep Tech", "Fintech", "France"…). |
| **INSEE SIRENE** | les immatriculations d'entreprises françaises récentes par code d'activité (NAF). |
| **Hacker News / GitHub** | des signaux "produit" et "tech" (projets qui montent). |

**Le "mining" (extraction depuis des listes).** Beaucoup de pages sont des
**listes** de startups : annuaires (F6S, Seedtable…) et **portfolios
d'accélérateurs** (Station F, French Tech, Bpifrance, YC, Antler…). On récupère le
texte de ces pages et on demande à Gemini (1 seul appel, **mutualisé** sur les
résultats Google + Apify) d'en **extraire les vraies startups individuelles** qui
collent à la thèse. C'est ce qui fait remonter des pépites peu connues.

**Le classement (ranking).** On classe les candidates par **pertinence aux critères**
(pas par notoriété) :
```
score = criteriaFit×1.4 + min(35, force_du_signal×0.5) + récence + bonus_multi-sources
```
`criteriaFit` (le match avec la thèse) **domine** ; la force de signal ne sert qu'à
départager. Ensuite : `filterByICP` (on jette le hors-profil), `resolveEntities` (1
appel Gemini qui nettoie le bruit : enlève les articles, les programmes, les non-
entreprises), puis **dédup par utilisateur** : on retire les sociétés déjà proposées
à ce user lors de runs passés **et** celles qu'il a rejetées (pouce bas).

---

### 4.3 Étape 3 — Sélection (scoring + "gate" de stade)

1. **Enrichissement Dealroom** : pour les meilleures candidates, on appelle
   `dealroomEnrich(nom)` qui va chercher le **stade réel** et les levées (via les
   actualités Dealroom). Mis en cache 5 jours.
2. **Scoring** (1 appel Gemini, en lot) : chaque candidate est notée sur 8 dimensions,
   avec `thesisFit` (adéquation à la thèse) **dominant**. Règles dures : une coquille
   de registre (INSEE sans produit/équipe) est plafonnée ; une société **trop avancée**
   (licorne, cotée, >100 M€ levés, nom grand public) est plafonnée à `thesisFit≤15` —
   **la notoriété n'est jamais un point positif**.
3. **Gate de stade** (`looksTooLate`, filtre déterministe = sans IA) : on **exclut
   avant la shortlist** toute société dont le stade réel dépasse le stade visé, ou dont
   le texte trahit Série C+/licorne/IPO/méga-levée, **un rachat** ("acquise par"), une
   **levée en milliards**, ou un **âge > 15 ans**. C'est une "triple défense"
   (mining + scoring + gate) contre le biais de notoriété.

**Sortie** : `picked_startup` (la startup retenue) + `shortlist` (les suivantes).

---

### 4.4 & 4.5 Étapes 4-5 — La Due Diligence (le rapport)

La fonction `due-diligence` travaille en **2 phases** :

**Phase `search`** : elle lance ~28 requêtes web ciblées sur la startup choisie
(équipe, produit, marché, presse, financements, risques) et **stocke** les résultats.
Elle renvoie un `jobId`.

**Phase `analyze`** : c'est là que l'IA rédige. Le déroulé précis :

1. **Recherches systématiques** (avant de rédiger) : on lance des requêtes ciblées
   sur les manques récurrents, **avec le nom de la société entre guillemets** (crucial
   pour la précision et pour faire remonter l'info récente) — voir §6.
2. **Boucle "lacunes" n°1** (1 appel Gemini) : *"Identifie 4 à 6 thèmes encore
   insuffisants/effleurés et donne des requêtes pour les creuser."* → on lance ces
   recherches → on les ajoute au contexte.
3. **Brouillon** (1 gros appel Gemini, jusqu'à 28 000 tokens de sortie) : Gemini rédige
   le rapport JSON complet en suivant la **"discipline d'analyse VC"** (voir §5.4).
4. **Approfondissement OBLIGATOIRE** (couche de critique + réécriture) : un appel
   Gemini **critique son propre brouillon** ("liste 5-8 points traités en surface ou
   non prouvés + des requêtes pour les creuser"), on lance ces recherches **en
   parallèle**, puis un dernier appel Gemini **réécrit** le rapport en y injectant les
   chiffres, exemples et **sources** trouvés. (Un garde-temps de 115 s protège : si on
   approche la limite, on garde le brouillon.)
5. **Vérification anti-hallucination** : on retire toute URL citée par l'IA qui
   n'existe pas dans les recherches réellement faites.

Le rapport final est **mis en cache** (clé `ddreport|v4|<nom>`, 3 jours). Le numéro
de version (`v4`) augmente à chaque amélioration des prompts, ce qui **invalide
automatiquement** les vieux rapports.

---

## 5. Comment on "prompte" Gemini (en détail)

Un **prompt** est juste un texte d'instructions. Souvent en deux parties : le
**system prompt** (le rôle/les règles globales : "tu es un analyste VC senior…") et
le **user prompt** (les données du cas + la tâche précise). Voici nos prompts clés,
résumés.

### 5.1 Prompt de thèse
Rôle : structurer les critères. Sortie JSON : `{ sectors, idealCompanyProfile,
mustHaveKeywords, exclusionKeywords, stage:{min,max}, priorityQueries }`. Règle
centrale : **les critères de l'utilisateur font autorité**, l'IA ne les invente ni ne
les contredit.

### 5.2 Prompt de mining (extraction de listes)
Rôle : *"Voici le texte brut de pages qui listent des startups. Extrais les VRAIES
startups nommées (entreprises finançables), exclus les investisseurs/médias/grands
groupes. RÈGLE STADE : on veut des boîtes émergentes au stade visé ou en dessous ;
exclus (ou note ≤15) les licornes/cotées/noms mondialement connus."* Sortie JSON :
liste `{name, description, relevance}`.

### 5.3 Prompt de scoring
Rôle : noter chaque candidate sur 8 dimensions (dont `thesisFit` dominant), avec des
règles dures (registre-seul, trop-avancé/notoriété → plafonné). Sortie JSON par
candidate.

### 5.4 Prompt de Due Diligence — la "discipline d'analyse VC"
C'est le prompt le plus important. Au lieu de **décrire** (fiche Wikipédia), il force
Gemini à **analyser comme un investisseur**. Les règles qu'on lui impose :
1. **Démontre, ne décris pas** : chaque argument important (positif/négatif) doit être
   prouvé par un **chiffre, une date, un nom, une source** — jamais un adjectif seul
   ("acteur majeur", "techno innovante" sont interdits sans la preuve qui suit).
2. **Récence** : utiliser l'info **la plus récente** ; un tour annoncé récemment prime
   sur d'anciens chiffres. **Calculer runway/âge/"prochaine levée" à partir
   d'aujourd'hui** (la date du jour est injectée dans le prompt).
3. **La notoriété n'est pas un argument.**
4. **Thèse falsifiable** : énoncer un **pari mesurable** ("on parie que [métrique]
   atteint [seuil] avant [date]"), pas du conditionnel prudent.
5. **Corréler les sections** : relier les faits (ex : techno = pari de physique → le
   risque dominant est technique → donc l'équipe est LE moat).
6. **Les chiffres qui décident** (burn, runway, valorisation, % détenu) : s'ils
   manquent, c'est le **risque n°1**, pas une estimation désinvolte ; on baisse alors
   le niveau de confiance.
7. **Mécanique du deal** : prix d'entrée, valorisation post-money, % obtenu, qui mène
   le tour, préférences de liquidation.
8. **Modèle de retour** : un calcul (valo de sortie, dilution, % → multiple) + des
   **comparables de sortie nommés**, dont un **cautionnaire** (ex : IonQ/Rigetti/
   D-Wave entrés en bourse par SPAC puis effondrés).
9. **Bear case spécifique** : la vraie raison de NE PAS investir, propre à cette boîte
   (pas un risque générique).
10. **Équipe** : ont-ils déjà construit/livré ? manque-t-il un profil commercial ?
11. **Recherche primaire** : quels appels de référence passer (ex-employés, clients).
12. **Décision conditionnelle** : "on investit SI […], on passe SI […], et voici les
    2-3 questions qui inverseraient la décision".

Plus une **"méthode par levier"** que Gemini adapte au secteur :
- **La métrique qui EST le produit** (ex : taux de survie à 3 ans pour la
  reforestation ; nombre de qubits logiques pour le quantique ; rétention/NRR pour le
  SaaS) devient le pivot de la thèse et du bear.
- **Moat = preuve chiffrée** (IP nommée, données propriétaires) sinon "non prouvé".
- **Business model → multiple de sortie** (SaaS = multiple élevé ; services = multiple
  bas 2-4×) : ne jamais asséner un multiple sans le justifier.
- **Substitut le moins cher** (à affronter dans le bear), **cohérence des chiffres**
  (signaler si total levé ≠ somme des tours), **client nommé** exigé en B2B.

On y ajoute aussi les **cadres financiers** d'un VC : multiples par secteur, DCF,
métriques (MRR/ARR, CAC, LTV, churn, burn, runway), TAM/SAM/SOM, et les clauses de
term sheet.

### 5.5 Prompt de critique (l'approfondissement)
Rôle : *"Tu relis ce brouillon. Liste 5 à 8 points traités en surface ou affirmés sans
preuve, classés par importance pour la décision, et donne pour chacun 1-2 requêtes
web précises pour les creuser."* Puis un prompt de **réécriture** réinjecte les
données trouvées et durcit la rigueur.

### 5.6 Réglages techniques des appels Gemini
- Modèle : **`gemini-3.5-flash`** partout (rapide).
- **Thinking désactivé** (`thinkingBudget:0`) pour les appels JSON → tout le budget va
  à la réponse (pas de troncature).
- **Mode JSON** activé → réponse structurée.
- **Rotation de 9 clés** : pour chaque appel, on tire une clé au hasard et on bascule
  sur une autre si l'une est en quota (erreur 429). Un **garde-fou journalier**
  (`AI_DAILY_LIMIT=2000`) compte les appels pour rester dans les limites.

---

## 6. Les requêtes web (exemples réels)

**Sourcing** (générées à partir de la thèse + des `priorityQueries` de l'IA),
exemples FR-biaisés et "frais" :
- `site:stationf.co <secteur> startup`
- `("French Tech Seed" OR "i-Lab" OR Bpifrance) lauréat <secteur> <géo> <année>`
- `<secteur> startup ("pre-seed" OR "seed") ("levée" OR "amorçage") <géo> <année>`
- `site:pappers.fr <secteur> "augmentation de capital"`
- `site:linkedin.com/company <secteur> startup <géo> <année>`

**Recherches systématiques de la DD** (nom de la société = `"X"`, entre guillemets) :

| Groupe | Requêtes |
|--------|----------|
| Équipe | `"X" founders CEO CTO background` · `"X" founding team linkedin` · `"X" fondateurs équipe dirigeante parcours` |
| Financements (récents) | `"X" latest funding round <année> <année-1>` · `"X" Series B C D raised million … investors` · `"X" levée de fonds … montant valorisation` · `"X" total funding raised to date` |
| Actualité | `"X" news <année>` · `"X" announcement partnership program <année>` |
| IP / Brevets | `site:patents.google.com X` · `"X" patent brevet espacenet filed granted` |
| Concurrents | `"X" competitors alternatives` · `"X" vs competitor funding market share` |
| Traction | `"X" customers partnership award prize <année>` · `"X" revenue traction publication results` |

**Requêtes de "creusage"** : générées à la volée par les boucles Gemini (lacunes +
critique) selon ce qui manque dans le brouillon.

---

## 7. Stockage — les tables Postgres

- **`pipeline_jobs`** : un job d'analyse (statut, étape, thèse structurée, pick,
  shortlist, rapport final, compteurs de retry…). C'est l'état vivant du pipeline.
- **`search_cache`** : cache des recherches web ET des rapports DD (clé hachée +
  résultats + date d'expiration). Évite de repayer un travail identique.
- **`user_sourced_companies`** : mémoire par utilisateur des sociétés déjà proposées
  (pour ne pas les re-suggérer).
- **`pick_feedback`** : les pouces 👍/👎 de l'utilisateur sur les picks (voir §8).
- **`ai_usage_daily`** : compteur d'appels IA du jour (garde-fou de quota).
- **`analysis_history`** : historique des analyses (réouvrables sans tout relancer).

---

## 8. Apprentissage — le feedback 👍/👎

Sur la page d'avancement, l'utilisateur peut juger le pick : **"Pertinent" (👍)** ou
**"Hors-cible" (👎)**. C'est enregistré dans `pick_feedback`. Effets aux prochains
runs : les 👎 sont **exclus durement** du sourcing ; les 👍 sont injectés comme
**exemples** dans le prompt de thèse (l'outil apprend le goût du fonds).

---

## 9. Sécurité & accès

- **Accès réservé aux connectés** : les pages d'analyse (`/analyser`, `/pipeline`,
  `/due-diligence`) sont derrière un **garde** (`ProtectedRoute`) ; un visiteur non
  connecté est renvoyé à l'accueil qui lui propose de créer un compte.
- **RLS** sur les tables utilisateur (chacun ne voit que ses données).
- **Secrets** (clés Gemini, Oxylabs, Apify…) stockés côté Supabase, **jamais dans le
  code**. Le navigateur n'a que la clé anon (publique, droits limités).

---

## 10. Exporter le rapport

Depuis le mémo, deux boutons : **"Télécharger le PDF"** (rapport mis en forme, qui
inclut la section Comité d'investissement) et **"Export Markdown"** (fichier texte).
Le PDF normalise les caractères spéciaux pour éviter le charabia.

---

## 11. Mémo des statuts d'un job (pour débugger)

`thesis_analyzing` (structure la thèse) → `thesis_done` → `sourcing_running` (cherche)
→ `sourcing_done` → `picking` (note + sélectionne) → `pick_done` → `dd_search_running`
(recherche DD) → `dd_search_done` → `dd_analyze_running` (rédige) → **`dd_done`** (fini)
/ `error` (échec). Si un statut ne bouge plus, le watchdog/cron relance ; au-delà de
10 min sans progrès, alerte + passage en `error`.
