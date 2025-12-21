# 🚀 Migration vers un Nouveau Projet Supabase

## 📋 Étape 1 : Créer un Nouveau Projet Supabase

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Cliquez sur "New Project"** (ou "Create Project")
3. **Remplissez les informations** :
   - **Name** : `dealflow-compass` (ou votre nom préféré)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAUVEGARDEZ-LE**)
   - **Region** : Choisissez la région la plus proche (ex: `West Europe` pour la France)
   - **Pricing Plan** : Free (pour commencer)
4. **Cliquez sur "Create new project"**
5. **Attendez 2-3 minutes** que le projet soit créé

---

## 🔑 Étape 2 : Récupérer les Nouvelles Clés API

1. **Dans votre nouveau projet**, allez dans **Settings** → **API**
2. **Copiez ces valeurs** (vous en aurez besoin) :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** key : `eyJhbGc...` (longue clé)
   - **service_role** key : `eyJhbGc...` (gardez-la secrète !)

---

## 💾 Étape 3 : Migrer la Base de Données

### Créer la Table `analysis_history`

1. **Dans votre nouveau projet**, allez dans **SQL Editor**
2. **Cliquez sur "New Query"**
3. **Copiez-collez** le SQL suivant (exactement comme dans votre migration) :

```sql
-- Create table for analysis history
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_name TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  investment_thesis JSONB,
  pitch_deck JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write access (no auth required for demo)
CREATE POLICY "Allow public read access" 
ON public.analysis_history 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.analysis_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);
```

4. **Cliquez sur "Run"** (ou Ctrl+Enter)
5. **Vérifiez** que la table est créée : **Table Editor** → Vous devriez voir `analysis_history`

---

## 🔧 Étape 4 : Migrer les Edge Functions

### Créer la Fonction `analyze-fund`

1. **Allez dans** : **Edge Functions** (menu de gauche)
2. **Cliquez sur "Deploy a new function"** → **"<> Via Editor"**
3. **Nommez la fonction** : `analyze-fund`
4. **Dans l'éditeur**, supprimez tout le code par défaut
5. **Ouvrez** le fichier local : `supabase/functions/analyze-fund/index.ts`
6. **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)
7. **Collez** dans l'éditeur Supabase (Ctrl+V)
8. **Cliquez sur "Deploy"**

---

## 🔐 Étape 5 : Configurer les Secrets

### Ajouter GEMINI_API_KEY

1. **Allez dans** : **Secrets** (menu de gauche, sous "Functions")
2. **Cliquez sur "Add Secret"**
3. **Remplissez** :
   - **Name** : `GEMINI_API_KEY`
   - **Value** : Votre clé API Gemini (commence par `AIza...`)
4. **Cliquez sur "Save"**

### (Optionnel) Ajouter GROQ_API_KEY

Si vous voulez aussi Groq :
1. **Cliquez sur "Add Secret"**
2. **Remplissez** :
   - **Name** : `GROQ_API_KEY`
   - **Value** : Votre clé API Groq (commence par `gsk_...`)
3. **Cliquez sur "Save"**

---

## 🔄 Étape 6 : Mettre à Jour les Variables d'Environnement

### Mettre à jour le fichier `.env`

1. **Ouvrez** le fichier `.env` à la racine du projet
2. **Remplacez** les anciennes valeurs par les nouvelles :

```env
VITE_SUPABASE_URL=https://votre-nouveau-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre-nouvelle-anon-key
```

3. **Sauvegardez** le fichier

### Si vous n'avez pas de fichier `.env`

1. **Créez** un fichier `.env` à la racine du projet
2. **Copiez** depuis `env.example` :
   ```bash
   cp env.example .env
   ```
3. **Éditez** `.env` et ajoutez vos nouvelles valeurs

---

## ✅ Étape 7 : Tester

1. **Redémarrez** le serveur de développement :
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   npm run dev
   ```

2. **Ouvrez** http://localhost:8080

3. **Testez une analyse** :
   - Entrez "Sequoia Capital"
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner ! 🎉

---

## 🔍 Vérification

### Vérifier que tout fonctionne :

1. ✅ **Base de données** : Table Editor → `analysis_history` existe
2. ✅ **Edge Function** : Edge Functions → `analyze-fund` existe et est déployée
3. ✅ **Secrets** : Secrets → `GEMINI_API_KEY` existe
4. ✅ **Variables d'environnement** : `.env` contient les nouvelles valeurs
5. ✅ **Application** : L'analyse fonctionne sans erreur

---

## 🐛 Dépannage

### Erreur : "Supabase credentials are missing"
- Vérifiez que le fichier `.env` existe
- Vérifiez que les variables commencent par `VITE_`
- Redémarrez le serveur après modification de `.env`

### Erreur : "Table does not exist"
- Vérifiez que vous avez bien exécuté le SQL dans le nouveau projet
- Vérifiez dans Table Editor que `analysis_history` existe

### Erreur : "Function not found"
- Vérifiez que la fonction `analyze-fund` est bien déployée
- Vérifiez que vous utilisez la bonne URL dans `.env`

### Erreur : "API Key not found"
- Vérifiez que `GEMINI_API_KEY` est bien dans Secrets
- Attendez 30 secondes après avoir ajouté le secret
- Redéployez la fonction après avoir ajouté le secret

---

## 📝 Checklist de Migration

- [ ] Nouveau projet Supabase créé
- [ ] Nouvelles clés API récupérées
- [ ] Table `analysis_history` créée
- [ ] Edge Function `analyze-fund` déployée
- [ ] Secret `GEMINI_API_KEY` configuré
- [ ] Fichier `.env` mis à jour
- [ ] Serveur redémarré
- [ ] Test réussi

---

## 🆘 Si ça ne marche pas

Si après toutes ces étapes ça ne fonctionne toujours pas, on passera à **l'Option C : Vercel + PlanetScale**.

Dites-moi où vous en êtes et je vous aiderai ! 🚀

