# 📝 Guide : Appliquer les Migrations SQL dans Supabase Dashboard

## 🎯 Objectif
Appliquer les migrations SQL pour activer l'authentification et la gestion des utilisateurs.

---

## 📋 Étape 1 : Ouvrir le SQL Editor dans Supabase

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Connectez-vous** avec votre compte
3. **Sélectionnez votre projet** (celui avec l'URL `anxyjsgrittdwrizqcgi.supabase.co`)
4. **Dans le menu de gauche**, cliquez sur **"SQL Editor"** (icône avec `</>` ou "SQL Editor")
5. **Cliquez sur "New Query"** (bouton en haut à droite)

---

## 📋 Étape 2 : Appliquer la Migration 1 (si pas déjà fait)

### Vérifier d'abord si la table existe déjà :

1. **Dans le SQL Editor**, collez ceci pour vérifier :
```sql
SELECT * FROM public.analysis_history LIMIT 1;
```

2. **Cliquez sur "Run"** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)

### Si vous obtenez une erreur "relation does not exist", appliquez la migration 1 :

1. **Ouvrez le fichier** : `supabase/migrations/20251214171526_c6fdb6b8-8483-4f31-b474-511c4518ed13.sql`
2. **Copiez TOUT le contenu** du fichier
3. **Collez-le dans le SQL Editor** de Supabase
4. **Cliquez sur "Run"**

Le contenu devrait être :
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

5. **Vérifiez le résultat** : Vous devriez voir "Success. No rows returned"

---

## 📋 Étape 3 : Appliquer la Migration 2 (Auth + User Profiles) - IMPORTANTE

### Option A : Copier depuis le fichier (Recommandé)

1. **Ouvrez le fichier** : `supabase/migrations/20250115000000_add_auth_and_user_profiles.sql`
2. **Copiez TOUT le contenu** du fichier
3. **Dans Supabase SQL Editor**, créez une **nouvelle query** (New Query)
4. **Collez le contenu**
5. **Cliquez sur "Run"**

### Option B : Copier directement depuis ici

1. **Dans Supabase SQL Editor**, créez une **nouvelle query** (New Query)
2. **Collez ce SQL complet** :

```sql
-- Add user_id to analysis_history table
ALTER TABLE public.analysis_history 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create user_profiles table for additional user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  role TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  trial_credits_remaining INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update analysis_history RLS policies to require auth
DROP POLICY IF EXISTS "Allow public read access" ON public.analysis_history;
DROP POLICY IF EXISTS "Allow public insert access" ON public.analysis_history;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses"
ON public.analysis_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
ON public.analysis_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
ON public.analysis_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. **Cliquez sur "Run"** (ou `Ctrl+Enter` / `Cmd+Enter`)

4. **Vérifiez le résultat** : Vous devriez voir "Success. No rows returned"

---

## ✅ Étape 4 : Vérifier que tout est bien appliqué

### Vérification 1 : Vérifier les tables

1. **Dans Supabase Dashboard**, allez dans **"Table Editor"** (menu de gauche)
2. **Vérifiez que vous voyez** :
   - ✅ `user_profiles` (nouvelle table)
   - ✅ `analysis_history` (avec colonne `user_id`)

### Vérification 2 : Vérifier les policies RLS

1. **Dans Supabase Dashboard**, allez dans **"Authentication"** → **"Policies"**
2. **Ou dans SQL Editor**, exécutez :
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'analysis_history');
```

Vous devriez voir les policies créées.

### Vérification 3 : Vérifier le trigger

1. **Dans Supabase Dashboard**, allez dans **"Database"** → **"Triggers"**
2. **Vérifiez que** `on_auth_user_created` existe

---

## 🎯 Étape 5 : Activer l'Email Auth (si pas déjà fait)

1. **Dans Supabase Dashboard**, allez dans **"Authentication"** → **"Providers"**
2. **Trouvez "Email"** dans la liste
3. **Activez-le** si ce n'est pas déjà fait (toggle ON)
4. **Optionnel** : Pour le développement, vous pouvez désactiver "Confirm email" pour tester plus rapidement

---

## 🧪 Étape 6 : Tester dans l'application

1. **Démarrez l'application** :
   ```bash
   npm run dev
   ```

2. **Allez sur** : `http://localhost:8080`

3. **Testez l'inscription** :
   - Cliquez sur "Créer un compte" ou "Connexion"
   - Créez un compte avec email + mot de passe
   - Vérifiez que vous êtes connecté

4. **Vérifiez dans Supabase** :
   - **Table Editor** → `user_profiles` : Vous devriez voir votre profil créé automatiquement
   - **Authentication** → **Users** : Vous devriez voir votre utilisateur

5. **Testez une analyse** :
   - Faites une recherche de fond (ex: "Accel")
   - Attendez la fin de l'analyse
   - Vérifiez que l'historique s'affiche

6. **Vérifiez dans Supabase** :
   - **Table Editor** → `analysis_history` : Vous devriez voir votre analyse avec `user_id` rempli

---

## 🐛 Dépannage

### Erreur : "column user_id already exists"
→ C'est normal si vous avez déjà ajouté la colonne. La migration utilise `ADD COLUMN IF NOT EXISTS` pour éviter cette erreur.

### Erreur : "relation user_profiles already exists"
→ La table existe déjà. C'est OK, la migration utilise `CREATE TABLE IF NOT EXISTS`.

### Erreur : "permission denied"
→ Vérifiez que vous êtes bien connecté à Supabase avec un compte admin du projet.

### Les analyses ne s'affichent pas après connexion
→ Vérifiez que :
1. Vous êtes bien connecté (email affiché dans le header)
2. Le `user_id` est bien rempli dans `analysis_history`
3. Les policies RLS sont bien créées

### Le profil utilisateur n'est pas créé automatiquement
→ Vérifiez que :
1. Le trigger `on_auth_user_created` existe dans Database → Triggers
2. La fonction `handle_new_user()` existe dans Database → Functions

---

## 📚 Ressources

- [Documentation Supabase SQL](https://supabase.com/docs/guides/database)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

## ✅ Checklist Finale

- [ ] Migration 1 appliquée (table `analysis_history`)
- [ ] Migration 2 appliquée (table `user_profiles` + RLS)
- [ ] Colonne `user_id` ajoutée à `analysis_history`
- [ ] Policies RLS créées pour `user_profiles`
- [ ] Policies RLS créées pour `analysis_history`
- [ ] Trigger `on_auth_user_created` créé
- [ ] Email Auth activé dans Authentication → Providers
- [ ] Test d'inscription réussi
- [ ] Test de connexion réussi
- [ ] Test d'analyse avec sauvegarde réussi

Une fois tous les items cochés, l'authentification est complètement fonctionnelle ! 🎉

