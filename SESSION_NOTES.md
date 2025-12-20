# Notes de Session - DealFlow Compass

**Date de dernière mise à jour :** 20 décembre 2025

## 📋 État Actuel du Projet

### ✅ Ce qui fonctionne

1. **Frontend (React + TypeScript + Vite)**
   - Application fonctionnelle sur `localhost:8080`
   - Interface pour analyser des fonds VC ou utiliser une thèse personnalisée
   - Affichage des rapports de due diligence avec slides
   - Formatage des métriques ($10M, $500K, etc.)
   - Liens Website et LinkedIn pour les startups
   - Badges de vérification des données

2. **Backend (Supabase Edge Functions)**
   - Edge Function `analyze-fund` déployée (version 7)
   - Intégration avec Google Gemini API (gratuit, 15 req/min)
   - Génération de rapports de due diligence détaillés
   - Support pour 1-5 startups par analyse
   - Thèse d'investissement personnalisée

3. **Base de données (Supabase)**
   - Table `analysis_history` pour sauvegarder les analyses
   - Migration appliquée

### 🔧 Dernières Modifications

#### Améliorations du Rendu (Session actuelle)
- **Slides plus grandes** : min-height 650px
- **Contenu enrichi** : 300-400 mots par slide (au lieu de 3 lignes)
- **Formatage des métriques** : $10,000,000 → $10M, $500,000 → $500K
- **Sources et liens** : Website et LinkedIn cliquables pour chaque startup
- **Layout amélioré** : grille responsive, cartes avec hover effects
- **Prompts renforcés** : Edge Function demande explicitement 300-400 mots minimum par slide

#### Edge Function v7
- Prompts simplifiés (trop longs avant)
- Gestion d'erreurs améliorée avec messages clairs
- Vérification de la clé API Gemini avec messages d'erreur explicites

### ⚠️ Problèmes Connus / À Faire

1. **Clé API Gemini à configurer dans Supabase**
   - **Action requise** : Ajouter le secret `GEMINI_API_KEY` dans Supabase Dashboard
   - URL : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
   - Settings > Secrets > Add Secret
   - Nom : `GEMINI_API_KEY`
   - Valeur : `AIzaSyDum1TiEMtDv9TgmpkgiOwV_AAO0GOPa4s`
   - **Sans ça, l'Edge Function retourne une erreur**

2. **Les anciennes analyses ne changent pas**
   - Les analyses déjà générées ont été créées avec l'ancien système
   - **Solution** : Faire une nouvelle analyse pour voir les améliorations

3. **Cache du navigateur**
   - Si les changements frontend ne s'affichent pas, faire un hard refresh : `Ctrl+Shift+R`

### 📁 Structure du Projet

```
dealflow-compass/
├── src/
│   ├── components/
│   │   ├── SlideCarousel.tsx          # Affichage des slides (AMÉLIORÉ)
│   │   ├── StartupCard.tsx             # Carte startup avec liens (AMÉLIORÉ)
│   │   ├── FundInfo.tsx               # Infos fonds avec sources
│   │   ├── CustomThesisInput.tsx      # Input thèse personnalisée
│   │   └── ...
│   └── pages/
│       └── Index.tsx                   # Page principale
├── supabase/
│   ├── functions/
│   │   └── analyze-fund/
│   │       └── index.ts               # Edge Function v7 (DÉPLOYÉE)
│   └── migrations/
│       └── 20251214171526_*.sql       # Migration appliquée
├── .env                                # Variables locales (NE PAS COMMIT)
└── README.md                           # Documentation principale
```

### 🔑 Variables d'Environnement

**Local (.env)** :
```
VITE_SUPABASE_URL=https://bdsetpsitqhzpnitxibo.supabase.co
VITE_SUPABASE_ANON_KEY=<votre_anon_key>
GEMINI_API_KEY=AIzaSyDum1TiEMtDv9TgmpkgiOwV_AAO0GOPa4s
```

**Supabase Secrets** (Dashboard) :
- `GEMINI_API_KEY` : **À AJOUTER** (même valeur que ci-dessus)

### 🚀 Commandes Utiles

```bash
# Démarrer le serveur de développement
npm run dev
# → http://localhost:8080

# Déployer l'Edge Function
supabase functions deploy analyze-fund

# Voir les logs de l'Edge Function
supabase functions logs analyze-fund
```

### 📝 Prochaines Étapes Suggérées

1. **Tester avec une nouvelle analyse** après avoir ajouté la clé API
2. **Vérifier que les slides contiennent bien 300-400 mots**
3. **Améliorer l'affichage des sources** si nécessaire
4. **Ajouter plus de métriques** dans les slides si demandé

### 🐛 Dépannage

**Erreur "Edge Function returned a non-2xx status code"**
- Vérifier que `GEMINI_API_KEY` est bien configuré dans Supabase
- Vérifier les logs : `supabase functions logs analyze-fund`

**Les changements ne s'affichent pas**
- Hard refresh navigateur : `Ctrl+Shift+R`
- Redémarrer le serveur : `npm run dev`
- Faire une **nouvelle analyse** (les anciennes ne changent pas)

**Rate limit Gemini**
- Limite : 15 requêtes/minute
- Attendre 1 minute entre les analyses si erreur 429

### 📚 Documentation

- `README.md` : Guide principal
- `SUPABASE_SETUP.md` : Configuration Supabase
- `GEMINI_SETUP.md` : Configuration Gemini API
- `EDGE_FUNCTION_GUIDE.md` : Guide Edge Functions

### 🔗 Liens Importants

- **GitHub** : https://github.com/rayanouabri/dealflow-compass
- **Supabase Dashboard** : https://app.supabase.com/project/bdsetpsitqhzpnitxibo
- **Edge Function** : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
- **Gemini API** : https://makersuite.google.com/app/apikey

---

## 📖 Contexte du Projet

**DealFlow Compass** est une application pour aider les fonds VC à :
- **Sourcer** des startups correspondant à leur thèse d'investissement
- **Effectuer une due diligence** automatisée avec rapports détaillés
- **Analyser** des fonds VC existants ou définir une thèse personnalisée

**Stack Technique** :
- Frontend : React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend : Supabase (Edge Functions, PostgreSQL)
- AI : Google Gemini API (gratuit)

**Objectif Principal** : Maximiser la véracité des informations (RÈGLE #1)

---

*Ce fichier est mis à jour à chaque session importante pour faciliter la reprise du travail.*

