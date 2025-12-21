# 🔐 Guide de Configuration de l'Authentification

## 📋 Étapes pour Activer l'Authentification

### 1. Appliquer les Migrations SQL

1. **Allez dans Supabase Dashboard** : [https://app.supabase.com](https://app.supabase.com)
2. **Sélectionnez votre projet**
3. **SQL Editor** → **New Query**

#### Migration 1 : Table `analysis_history` (si pas déjà fait)
```sql
-- Copiez le contenu de : supabase/migrations/20251214171526_c6fdb6b8-8483-4f31-b474-511c4518ed13.sql
```

#### Migration 2 : Auth + User Profiles (NOUVELLE)
```sql
-- Copiez le contenu de : supabase/migrations/20250115000000_add_auth_and_user_profiles.sql
```

**OU** copiez directement ce SQL :

```sql
-- Add user_id to analysis_history table
ALTER TABLE public.analysis_history 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create user_profiles table for additional user data
CREATE TABLE public.user_profiles (
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

-- Create index for faster queries
CREATE INDEX idx_analysis_history_user_id ON public.analysis_history(user_id, created_at DESC);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. **Cliquez sur "Run"** pour exécuter la migration

### 2. Activer l'Email Auth dans Supabase

**Instructions Détaillées** :

1. **Allez dans** : **Authentication** (menu de gauche dans Supabase Dashboard)
2. **Cliquez sur "Sign In / Providers"** dans la section **CONFIGURATION**
3. **Trouvez "Email"** dans la liste des providers
4. **Cliquez sur "Email"** pour ouvrir ses paramètres
5. **Activez le toggle** (bouton ON/OFF) à côté de "Enable Email provider"
   - ✅ Le toggle doit être **vert/activé** pour que ça fonctionne

**Configuration Optionnelle** :

- **Pour le Développement (Test Rapide)** :
  - **Désactivez "Confirm email"** (toggle OFF)
  - ⚠️ Cela permet de tester rapidement sans confirmer l'email

- **Pour la Production** :
  - **Activez "Confirm email"** (toggle ON)
  - ⚠️ Les utilisateurs devront confirmer leur email avant de se connecter

> 📖 **Guide complet avec captures d'écran** : Voir [`ACTIVER_EMAIL_AUTH.md`](./ACTIVER_EMAIL_AUTH.md)

### 3. Tester l'Authentification

1. **Démarrez l'application** : `npm run dev`
2. **Allez sur** : `http://localhost:8080`
3. **Cliquez sur "Créer un compte"** ou "Connexion"
4. **Créez un compte** avec email + mot de passe
5. **Vérifiez** :
   - ✅ Le profil utilisateur est créé automatiquement
   - ✅ Vous pouvez vous connecter/déconnecter
   - ✅ Les analyses sont sauvegardées avec votre `user_id`
   - ✅ Vous ne voyez que vos propres analyses

## 🔍 Vérification

### Vérifier que tout fonctionne :

1. **Dans Supabase Dashboard** → **Table Editor** :
   - Vérifiez que `user_profiles` contient votre profil
   - Vérifiez que `analysis_history` a des entrées avec `user_id`

2. **Dans l'application** :
   - Créez un compte
   - Faites une analyse
   - Vérifiez que l'historique s'affiche
   - Déconnectez-vous et reconnectez-vous
   - Vérifiez que vous voyez toujours vos analyses

## 🐛 Dépannage

### Erreur "relation user_profiles does not exist"
→ La migration n'a pas été appliquée. Réexécutez la migration SQL.

### Erreur "permission denied for table analysis_history"
→ Les policies RLS ne sont pas correctes. Vérifiez que les policies sont bien créées.

### Le profil utilisateur n'est pas créé automatiquement
→ Vérifiez que le trigger `on_auth_user_created` existe dans Supabase Dashboard → Database → Triggers

### Les analyses ne s'affichent pas
→ Vérifiez que `user_id` est bien rempli dans `analysis_history` et que vous êtes connecté.

## 📚 Documentation Supabase Auth

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

