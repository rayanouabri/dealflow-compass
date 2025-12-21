# 🔍 Explication : Ce que fait le Code de l'Edge Function

## 📋 Vue d'Ensemble

L'Edge Function `analyze-fund` est appelée par votre application frontend pour :
1. **Sourcer** des startups réelles qui correspondent à la thèse d'un fond VC
2. **Analyser** ces startups avec une due diligence complète
3. **Retourner** un rapport détaillé avec toutes les métriques

---

## 🎯 Structure du Code

### 1. **Imports et Configuration Initiale** (lignes 1-20)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

**Ce que ça fait** :
- Importe la fonction `serve` de Deno (le runtime qui exécute le code)
- Configure les headers CORS pour permettre les requêtes depuis votre frontend

**Pourquoi** : Sans CORS, votre frontend ne peut pas appeler l'Edge Function (erreur de sécurité du navigateur)

---

### 2. **Fonction de Recherche Web (Brave Search)** (lignes ~50-100)

```typescript
async function braveSearch(query: string, count: number = 5)
```

**Ce que ça fait** :
- Utilise l'API Brave Search pour chercher des informations sur le web
- Retourne des résultats de recherche (titres, descriptions, URLs)

**Exemple** :
- Recherche : "Sequoia Capital investment thesis"
- Retourne : Articles, pages web, informations sur Sequoia

**Pourquoi** : Pour avoir des données RÉELLES et VÉRIFIÉES, pas des données inventées

---

### 3. **Fonction d'Enrichissement de Données** (lignes ~100-150)

```typescript
async function enrichStartupData(startup: any, fundContext: string)
async function enrichMarketData(sector: string, geography: string)
```

**Ce que ça fait** :
- `enrichStartupData` : Cherche des informations supplémentaires sur une startup (site web, LinkedIn, métriques)
- `enrichMarketData` : Cherche des données de marché (TAM, SAM, SOM, tendances)

**Exemple** :
- Startup : "Stripe"
- Enrichit avec : Site web, LinkedIn, ARR, funding, etc.

**Pourquoi** : Pour avoir le maximum de données vérifiées sur chaque startup

---

### 4. **Fonction Principale `serve`** (ligne ~150+)

C'est le cœur de l'Edge Function. Elle s'exécute à chaque appel.

#### A. **Gestion CORS** (lignes ~160-170)

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

**Ce que ça fait** :
- Répond aux requêtes "preflight" du navigateur
- Permet au frontend d'appeler l'Edge Function

**Pourquoi** : Le navigateur envoie d'abord une requête OPTIONS pour vérifier les permissions

---

#### B. **Lecture des Données de la Requête** (lignes ~170-190)

```typescript
const requestData = await req.json();
const { fundName, customThesis, params = {} } = requestData;
```

**Ce que ça fait** :
- Lit les données envoyées par votre frontend
- Extrait : le nom du fond, la thèse personnalisée, les paramètres

**Exemple de données reçues** :
```json
{
  "fundName": "Sequoia Capital",
  "params": {
    "numberOfStartups": 1,
    "startupStage": "seed"
  }
}
```

---

#### C. **Vérification des Clés API** (lignes ~190-210)

```typescript
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
```

**Ce que ça fait** :
- Vérifie qu'une clé API AI est configurée (Groq ou Gemini)
- Retourne une erreur si aucune clé n'est trouvée

**Pourquoi** : Sans clé API, on ne peut pas appeler l'IA pour analyser

---

#### D. **Recherche de la Thèse du Fonds** (lignes ~210-235)

```typescript
if (fundName) {
  const fundResults = await braveSearch(`${fundName} investment thesis...`);
  fundThesisContext = fundResults.map(...).join("\n");
}
```

**Ce que ça fait** :
- Cherche sur le web la thèse d'investissement du fond
- Extrait : secteurs cibles, stade préféré, géographie, taille de ticket

**Exemple** :
- Fonds : "Sequoia Capital"
- Trouve : "Sequoia investit dans les startups tech B2B, stade Seed à Series A, US/Europe, tickets $1-5M"

**Pourquoi** : Pour comprendre QUOI chercher (quelles startups sourcer)

---

#### E. **Sourcing de Startups Réelles** (lignes ~240-270)

```typescript
// Construit des requêtes de recherche pour trouver des startups
startupSearchQueries.push(`${sector} startup ${stage} ${geography} 2024`);

// Exécute les recherches
for (const query of startupSearchQueries) {
  const results = await braveSearch(query, 5);
  startupSearchResults.push(...results);
}
```

**Ce que ça fait** :
- Construit des requêtes de recherche ciblées
- Cherche des startups RÉELLES qui correspondent aux critères
- Collecte jusqu'à 15 résultats de startups potentielles

**Exemple** :
- Recherche : "SaaS startup seed stage US 2024"
- Trouve : Liste de vraies startups SaaS en seed aux US

**Pourquoi** : C'est le CŒUR du système - trouver des startups RÉELLES, pas inventées

---

#### F. **Construction du Prompt pour l'IA** (lignes ~280-450)

```typescript
const systemPrompt = `Tu es un analyste VC SENIOR...`;
const userPrompt = `🎯 MISSION : SOURCER ET ANALYSER...`;
```

**Ce que ça fait** :
- Construit les instructions pour l'IA (Gemini ou Groq)
- Dit à l'IA : "Source des startups réelles, analyse-les en détail, donne toutes les métriques"

**Pourquoi** : L'IA a besoin d'instructions claires pour faire le bon travail

---

#### G. **Appel à l'IA** (lignes ~450-550)

```typescript
if (AI_PROVIDER === "groq") {
  aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: "llama-3.1-70b-versatile", messages: [...] })
  });
}
```

**Ce que ça fait** :
- Envoie le prompt à l'IA (Groq ou Gemini)
- Reçoit la réponse avec l'analyse des startups

**Pourquoi** : L'IA fait le travail d'analyse et de structuration des données

---

#### H. **Traitement de la Réponse de l'IA** (lignes ~550-650)

```typescript
const data = await aiResponse.json();
const content = data.choices?.[0]?.message?.content;
let analysisResult = JSON.parse(cleanContent);
```

**Ce que ça fait** :
- Parse la réponse JSON de l'IA
- Nettoie le contenu (enlève les markdown, etc.)
- Extrait les données structurées

**Pourquoi** : L'IA retourne du texte, il faut le convertir en données utilisables

---

#### I. **Enrichissement des Startups** (lignes ~650-700)

```typescript
const enrichedStartups = await Promise.all(
  analysisResult.startups.map(startup => 
    enrichStartupData(startup, fundThesisContext)
  )
);
```

**Ce que ça fait** :
- Pour chaque startup trouvée par l'IA
- Cherche des informations supplémentaires sur le web
- Ajoute : URLs, sources, métriques vérifiées

**Pourquoi** : Pour avoir le maximum de données réelles et vérifiées

---

#### J. **Retour de la Réponse** (lignes ~700-750)

```typescript
return new Response(
  JSON.stringify(analysisResult),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

**Ce que ça fait** :
- Retourne les résultats au frontend
- Format JSON avec toutes les données

**Ce que contient la réponse** :
```json
{
  "investmentThesis": { ... },
  "startups": [
    {
      "name": "Nom de la startup",
      "metrics": { "arr": "$2.5M", ... },
      "dueDiligenceReports": [ ... ]
    }
  ]
}
```

---

## 🔄 Flux Complet (Résumé)

```
1. Frontend envoie : { fundName: "Sequoia Capital" }
   ↓
2. Edge Function reçoit la requête
   ↓
3. Cherche la thèse de Sequoia sur le web
   ↓
4. Cherche des startups réelles qui correspondent
   ↓
5. Construit un prompt pour l'IA
   ↓
6. Appelle l'IA (Groq/Gemini) avec le prompt
   ↓
7. L'IA analyse et retourne un JSON structuré
   ↓
8. Enrichit les données avec des recherches web supplémentaires
   ↓
9. Retourne tout au frontend
   ↓
10. Frontend affiche les résultats
```

---

## 🎯 Points Clés

### Ce que le code FAIT :
- ✅ Reçoit une requête du frontend
- ✅ Cherche des informations sur le web (Brave Search)
- ✅ Appelle l'IA pour analyser
- ✅ Enrichit les données avec des recherches supplémentaires
- ✅ Retourne un rapport structuré

### Ce que le code NE FAIT PAS :
- ❌ Ne stocke pas les données (c'est le frontend qui le fait)
- ❌ Ne gère pas l'authentification (c'est Supabase Auth)
- ❌ Ne fait pas de calculs complexes (c'est l'IA qui le fait)

---

## 💡 En Résumé

**Le code de l'Edge Function** :
1. **Écoute** les requêtes du frontend
2. **Cherche** des informations sur le web
3. **Demande à l'IA** de sourcer et analyser des startups
4. **Enrichit** les données avec des recherches supplémentaires
5. **Retourne** un rapport complet au frontend

C'est comme un **assistant intelligent** qui :
- Comprend ce que vous cherchez (la thèse du fond)
- Trouve des startups réelles qui correspondent
- Les analyse en profondeur
- Vous donne un rapport détaillé

---

## 🔧 Variables Importantes

- `fundName` : Le nom du fond VC (ex: "Sequoia Capital")
- `customThesis` : Thèse personnalisée si pas de nom de fond
- `numberOfStartups` : Combien de startups sourcer (1-5)
- `GROQ_API_KEY` / `GEMINI_API_KEY` : Clés pour appeler l'IA
- `BRAVE_API_KEY` : Clé pour les recherches web (optionnel)

---

## 📝 Exemple Concret

**Requête entrante** :
```json
{
  "fundName": "Sequoia Capital",
  "params": { "numberOfStartups": 1 }
}
```

**Ce que le code fait** :
1. Cherche "Sequoia Capital investment thesis" → Trouve leur focus
2. Cherche "SaaS startup seed US 2024" → Trouve des startups réelles
3. Demande à l'IA : "Analyse cette startup en détail"
4. Enrichit avec des recherches supplémentaires
5. Retourne un rapport complet

**Réponse sortante** :
```json
{
  "startups": [{
    "name": "Nom réel de startup",
    "metrics": { "arr": "$2.5M", "cac": "$500", ... },
    "dueDiligenceReports": [...]
  }]
}
```

---

Voilà ! C'est ce que fait le code. C'est un **pipeline intelligent** qui transforme un nom de fond en un rapport d'analyse de startups complet. 🚀

