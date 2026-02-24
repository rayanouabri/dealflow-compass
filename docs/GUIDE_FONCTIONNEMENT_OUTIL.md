# Comment fonctionne DealFlow Compass

DealFlow Compass est un outil qui aide les investisseurs en capital-risque à trouver et analyser des startups. Voici comment il fonctionne, de bout en bout.


## Ce que fait l'outil en une phrase

L'utilisateur donne le nom d'un fonds VC ou décrit sa thèse d'investissement, et l'outil cherche automatiquement des startups qui correspondent, en sélectionne une, et produit un rapport de due diligence complet avec une recommandation d'investissement.


## Les grandes étapes

Le processus se déroule en cinq étapes :

1. L'utilisateur configure sa recherche
2. L'outil cherche des startups sur le web
3. Les résultats sont scorés et classés
4. Une due diligence approfondie est lancée sur la meilleure startup
5. Un rapport structuré est présenté avec une recommandation


## Étape 1 — Configuration

L'utilisateur a deux choix :

- Donner le nom d'un fonds VC (par exemple "Sequoia Capital" ou "Partech"). L'outil va chercher sur internet la thèse d'investissement de ce fonds : dans quels secteurs il investit, à quel stade, dans quelle géographie, à quel ticket moyen.

- Définir sa propre thèse en choisissant manuellement les secteurs (IA, FinTech, HealthTech...), le stade (Seed, Series A...), la géographie et la taille de ticket.

Il peut aussi régler des paramètres comme le nombre de startups à trouver ou le niveau de détail du rapport.


## Étape 2 — Recherche

C'est le cœur du moteur. L'outil lance un grand nombre de requêtes sur les moteurs de recherche (Serper pour les résultats Google, et Brave Search en complément).

Les recherches sont organisées en catégories pour couvrir un maximum de terrain :

- L'écosystème French Tech (LaFrenchTech, Next40, FT120)
- Les financements publics (Bpifrance, i-Nov, i-Lab, France 2030)
- Les incubateurs français (Station F, Agoranov, WILCO)
- Les labos et universités (CNRS, CEA, INRIA, Polytechnique — pour les spinoffs)
- Les programmes européens (EIC Accelerator, Horizon Europe)
- Les signaux de recrutement (offres de CTO, Head of AI, VP Engineering sur LinkedIn)
- La presse tech française (Maddyness, FrenchWeb, Journal du Net, Les Échos)
- Les brevets (INPI, Office européen des brevets)
- Et éventuellement des sources globales (Y Combinator, Techstars, Product Hunt)

Au total, jusqu'à 70 requêtes sont lancées. Les résultats sont ensuite dédupliqués (si la même entreprise apparaît dans plusieurs sources, elle est regroupée) et classés par pertinence.

Le score de classement est simple : plus une startup apparaît dans des catégories différentes et souvent, plus elle monte dans le classement.


## Étape 3 — Scoring et sélection

Les 10 meilleures startups sont envoyées à une IA (Gemini de Google) qui les évalue sur 7 critères :

- Qualité de l'équipe fondatrice (20%)
- Position concurrentielle et avantage compétitif (20%)
- Alignement avec la thèse d'investissement (15% — nécessaire mais insuffisant)
- Diversité des signaux trouvés (15%)
- Confirmation par plusieurs sources indépendantes (15%)
- Timing et momentum récent (10%)
- Présence dans l'écosystème français (5%)

Chaque critère reçoit une note de 0 à 100. Le score final est la moyenne pondérée. La startup avec le meilleur score est sélectionnée pour passer en due diligence.

L'IA identifie aussi pour chaque startup les red flags, les raisons d'investir maintenant, et des startups comparables.


## Étape 4 — Due diligence

La due diligence se fait en deux temps, pour contourner les limites de temps des serveurs.

Première passe — la recherche : l'outil lance 35 à 45 requêtes web ciblées sur la startup sélectionnée. Il cherche tout : l'identité de l'entreprise, ses fondateurs, ses levées de fonds, son produit, son marché, ses concurrents, ses brevets, ses actualités, ses avis, ses prix et récompenses. Les résultats sont catégorisés et stockés.

Deuxième passe — l'analyse : toutes les données collectées sont envoyées à l'IA avec un prompt détaillé. L'IA joue le rôle d'un analyste VC senior et produit un rapport structuré.

Entre les deux passes, il y a aussi une étape de "détection de lacunes" : l'IA regarde ce qui manque dans les données collectées (par exemple si on n'a rien trouvé sur l'équipe fondatrice) et lance des recherches complémentaires ciblées. Ce processus se fait deux fois pour maximiser la couverture.

L'IA utilisée est Gemini 2.5 Pro de Google, avec une température très basse (0.1) pour des réponses factuelles et précises. Si Gemini n'est pas disponible, le système bascule automatiquement sur Groq (modèle Llama) puis sur Vertex AI.


## Étape 5 — Le rapport

Le rapport final est présenté en 10 sections :

- Financements : historique des levées, valorisation, métriques financières
- Produit : description, technologie, brevets, fonctionnalités
- Marché : taille du marché (TAM/SAM/SOM), croissance, tendances
- Équipe : fondateurs avec parcours détaillé, taille, culture
- Traction : clients, milestones, partenariats, récompenses
- Concurrence : paysage, concurrents identifiés, avantage compétitif
- Risques : marché, exécution, financiers, réglementaires, avec mitigations
- Recommandation : verdict INVEST, WATCH ou PASS avec argumentation
- Sources : 15 à 25 sources vérifiées utilisées pour l'analyse
- Assistant IA : un chat pour poser des questions complémentaires sur le rapport

Le rapport est exportable en Markdown.


## Le mode automatique

Il existe aussi un mode "1 clic" qui enchaîne toutes les étapes automatiquement. L'utilisateur lance le pipeline et voit la progression en temps réel. Le système passe par l'analyse de la thèse, le sourcing, le scoring, la sélection, puis la due diligence complète, sans intervention. À la fin, il redirige directement vers le rapport.


## L'assistant IA

Une fois le rapport généré, l'utilisateur peut poser des questions dans un chat intégré. L'assistant a accès à toutes les données du rapport et effectue aussi des recherches web complémentaires pour répondre. Chaque réponse est accompagnée de sources.


## En résumé

L'outil combine recherche web automatisée (Serper + Brave), intelligence artificielle (Gemini / Groq) et un système de scoring pondéré pour transformer une thèse d'investissement en un rapport de due diligence actionnable. Le biais vers l'écosystème français est intégré dans les requêtes de recherche. Le tout tourne sur des fonctions serverless Supabase avec un frontend React.
