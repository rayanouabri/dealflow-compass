# 🚀 Guide de Déploiement de l'Edge Function

## ⚡ Méthode Rapide : Via Supabase Dashboard (2 minutes)

### 📋 Étapes Détaillées

1. **Ouvrez Supabase Dashboard**
   - Allez sur [https://app.supabase.com](https://app.supabase.com)
   - Connectez-vous et sélectionnez votre projet

2. **Accédez aux Edge Functions**
   - Dans le menu de gauche, cliquez sur **"Edge Functions"**
   - Vous verrez la liste de vos fonctions

3. **Ouvrez la fonction `analyze-fund`**
   - Cliquez sur **"analyze-fund"** dans la liste
   - Si elle n'existe pas, cliquez sur **"Create a new function"** et nommez-la `analyze-fund`

4. **Éditez le code**
   - Cliquez sur l'onglet **"Code"** ou **"Editor"** (en haut de la page)
   - **Sélectionnez tout le code existant** (Ctrl+A) et **supprimez-le** (Delete)

5. **Copiez le nouveau code**
   - Ouvrez le fichier `supabase/functions/analyze-fund/index.ts` dans votre éditeur local
   - **Sélectionnez tout** (Ctrl+A) et **copiez** (Ctrl+C)
   - **Collez** (Ctrl+V) dans l'éditeur de Supabase

6. **Déployez**
   - Cliquez sur le bouton **"Deploy"** ou **"Save"** (en haut à droite)
   - Attendez quelques secondes que le déploiement se termine
   - Vous verrez un message de confirmation

✅ **C'est fait !** L'Edge Function est maintenant déployée avec les dernières modifications.

---

## Option 1 : Déploiement via Supabase Dashboard (RECOMMANDÉ - Plus Simple)

### Étape 1 : Accéder à Supabase Dashboard

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Connectez-vous et sélectionnez votre projet

### Étape 2 : Déployer via l'interface web

1. Dans le menu de gauche, cliquez sur **"Edge Functions"**
2. Cliquez sur **"analyze-fund"** (ou créez-la si elle n'existe pas)
3. Allez dans l'onglet **"Code"** ou **"Editor"**
4. **Copiez le contenu** du fichier `supabase/functions/analyze-fund/index.ts`
5. **Collez-le** dans l'éditeur de Supabase
6. Cliquez sur **"Deploy"** ou **"Save"**

✅ **C'est tout !** L'Edge Function est maintenant déployée avec les dernières modifications.

---

## Option 2 : Déploiement via CLI (Pour les développeurs)

### Étape 1 : Installer Supabase CLI

**Sur Windows (PowerShell en tant qu'administrateur) :**

```powershell
# Option A : Via npm (si Node.js est installé)
npm install -g supabase

# Option B : Via Scoop (si Scoop est installé)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Option C : Télécharger manuellement
# Allez sur https://github.com/supabase/cli/releases
# Téléchargez supabase_windows_amd64.zip
# Extrayez et ajoutez au PATH
```

**Vérifier l'installation :**
```powershell
supabase --version
```

### Étape 2 : Se connecter à Supabase

```powershell
supabase login
```

Cela ouvrira votre navigateur pour vous authentifier.

### Étape 3 : Lier votre projet

```powershell
supabase link --project-ref uziptoizdbazdxgjqunp
```

> 💡 **Note** : Le `project-ref` est déjà dans `supabase/config.toml`

### Étape 4 : Déployer l'Edge Function

```powershell
supabase functions deploy analyze-fund
```

✅ **L'Edge Function est maintenant déployée !**

---

## Option 3 : Déploiement via GitHub Actions (Automatique)

Si vous voulez automatiser le déploiement à chaque push sur GitHub, créez `.github/workflows/deploy.yml` :

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - run: supabase functions deploy analyze-fund
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: uziptoizdbazdxgjqunp
```

---

## ✅ Vérification du Déploiement

1. Allez sur Supabase Dashboard → Edge Functions → `analyze-fund`
2. Vérifiez les **Logs** pour voir si la fonction fonctionne
3. Testez dans votre application : l'erreur devrait être plus claire maintenant

## 🐛 Dépannage

### Erreur : "Function not found"
- La fonction doit être créée dans Supabase Dashboard d'abord
- Ou utilisez `supabase functions deploy analyze-fund --no-verify-jwt` pour la première fois

### Erreur : "Authentication failed"
- Vérifiez que vous êtes bien connecté : `supabase login`
- Vérifiez que le projet est bien lié : `supabase projects list`

### Erreur : "Permission denied"
- Vérifiez que vous avez les droits d'admin sur le projet Supabase

---

## 📝 Résumé Rapide (Option 1 - Le Plus Simple)

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Edge Functions → `analyze-fund` → Code
3. Copiez-collez le contenu de `supabase/functions/analyze-fund/index.ts`
4. Deploy
5. ✅ Fait !

