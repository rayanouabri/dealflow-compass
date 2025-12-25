# Guide de Configuration Supabase pour DealFlow Compass

## 📋 Prérequis

- Un compte [Supabase](https://app.supabase.com)
- Node.js et npm installés
- Supabase CLI (optionnel, pour le déploiement local)

## 🔧 Configuration étape par étape

### Étape 1 : Créer un projet Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Cliquez sur **"New Project"**
3. Remplissez les informations :
   - **Name**: DealFlow Compass (ou votre nom)
   - **Database Password**: Choisissez un mot de passe fort
   - **Region**: Choisissez la région la plus proche
4. Cliquez sur **"Create new project"**
5. Attendez que le projet soit créé (2-3 minutes)

### Étape 2 : Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings** > **API**
2. Copiez les valeurs suivantes :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (la clé publique)

### Étape 3 : Configurer les variables d'environnement

1. Créez un fichier `.env` à la racine du projet
2. Ajoutez les valeurs suivantes :

```env
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_anon_key_ici
```

**Important**: Remplacez `votre-project-id` et `votre_anon_key_ici` par les vraies valeurs de votre projet Supabase.

### Étape 4 : Appliquer la migration de base de données

La migration crée la table `analysis_history` nécessaire pour stocker les analyses.

#### Option A : Via le Dashboard Supabase (Recommandé)

1. Allez dans **SQL Editor** dans votre projet Supabase
2. Créez une nouvelle requête
3. Copiez-collez le contenu de `supabase/migrations/20251214171526_c6fdb6b8-8483-4f31-b474-511c4518ed13.sql`
4. Exécutez la requête

#### Option B : Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref votre-project-id

# Appliquer les migrations
supabase db push
```

### Étape 5 : Déployer l'Edge Function

L'Edge Function `analyze-fund` est nécessaire pour analyser les fonds VC.

#### Via Supabase CLI :

```bash
# Déployer la fonction
supabase functions deploy analyze-fund

# Configurer le secret GEMINI_API_KEY (obligatoire)
supabase secrets set GEMINI_API_KEY="votre_cle_gemini_ici"

# (Optionnel) Configurer BRAVE_API_KEY pour enrichissement web
supabase secrets set BRAVE_API_KEY="votre_cle_brave_ici"
```

#### Via le Dashboard Supabase :

1. Allez dans **Edge Functions** dans votre projet
2. Créez une nouvelle fonction nommée `analyze-fund`
3. Copiez-collez le contenu de `supabase/functions/analyze-fund/index.ts`
4. Allez dans **Settings** > **Edge Functions** > **Secrets**
5. Ajoutez le secret `GEMINI_API_KEY` avec votre clé API Gemini
6. (Optionnel) Ajoutez le secret `BRAVE_API_KEY` pour enrichir les sources via recherche web

### Étape 6 : Obtenir une clé API Gemini (Gratuit)

1. Allez sur [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Créez une clé (elle commence généralement par `AIza...`)
3. Ajoutez-la dans Supabase en secret `GEMINI_API_KEY` (voir étape 5)

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Démarrez le serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrez http://localhost:8080

3. Essayez de faire une analyse :
   - Entrez un nom de fond VC (ex: "Sequoia Capital")
   - Cliquez sur "Analyze"
   - Si tout fonctionne, vous devriez voir une analyse complète

## 🐛 Dépannage

### Erreur : "Supabase credentials are missing"
- Vérifiez que votre fichier `.env` existe et contient les bonnes variables
- Redémarrez le serveur de développement après avoir créé/modifié `.env`

### Erreur : "GEMINI_API_KEY is not configured"
- Vérifiez que vous avez configuré le secret dans Supabase Edge Functions
- Vérifiez que le secret s'appelle exactement `GEMINI_API_KEY`
- Attendez 10-30 secondes après modification (propagation)

### Erreur : "relation 'analysis_history' does not exist"
- La migration n'a pas été appliquée
- Exécutez la migration SQL dans le SQL Editor de Supabase

### Erreur de connexion à Supabase
- Vérifiez que votre `VITE_SUPABASE_URL` est correct
- Vérifiez que votre `VITE_SUPABASE_PUBLISHABLE_KEY` est correct
- Vérifiez que votre projet Supabase est actif (pas en pause)

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google AI Studio (Gemini)](https://makersuite.google.com/app/apikey)

