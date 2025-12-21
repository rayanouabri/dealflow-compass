# 🔧 Correction : Erreur "API Key not found"

## ✅ Corrections Appliquées

### 1. **Amélioration de la gestion d'erreur dans l'Edge Function**
- Détection spécifique des erreurs de clé API manquante
- Messages d'erreur plus clairs avec instructions de configuration
- Vérification que la clé n'est pas vide

### 2. **Amélioration de l'affichage côté frontend**
- Messages d'erreur plus informatifs
- Instructions étape par étape pour configurer la clé API
- Détection automatique du type d'erreur (clé manquante, rate limit, etc.)

### 3. **Documentation améliorée**
- Guide de configuration rapide dans le README
- Instructions claires et visibles

## 🚀 Solution : Configurer GEMINI_API_KEY

### Étape 1 : Obtenir une clé API Gemini (GRATUITE)

1. Allez sur **[https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)**
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"** ou **"Get API Key"**
4. Sélectionnez un projet Google Cloud (ou créez-en un nouveau - c'est gratuit)
5. Votre clé API sera générée automatiquement
6. **Copiez la clé** (elle commence généralement par `AIza...`)

> 💡 **Note** : Le compte Google AI Studio est gratuit et ne nécessite pas de carte bancaire pour commencer. Vous avez droit à 15 requêtes/minute et 1,500 requêtes/jour gratuitement.

### Étape 2 : Ajouter le secret dans Supabase

1. Allez sur **[https://app.supabase.com](https://app.supabase.com)**
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **"Edge Functions"**
4. Cliquez sur votre fonction **`analyze-fund`**
5. Allez dans l'onglet **"Settings"** (ou cherchez **"Secrets"**)
6. Cliquez sur **"Add Secret"** ou **"New Secret"**
7. Remplissez :
   - **Nom** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Valeur** : Collez votre clé API Gemini
8. Cliquez sur **"Save"**

### Étape 3 : Attendre et tester

1. **Attendez 10-30 secondes** pour que le secret soit propagé
2. **Rafraîchissez votre application** (Ctrl+Shift+R ou Cmd+Shift+R)
3. **Testez une analyse** :
   - Entrez un nom de fond VC (ex: "Sequoia Capital")
   - Cliquez sur "Générer 1 startup(s)"
   - L'analyse devrait maintenant fonctionner !

## 📝 Fichiers Modifiés

Les modifications suivantes ont été commitées et poussées sur GitHub :

- ✅ `supabase/functions/analyze-fund/index.ts` - Gestion d'erreur améliorée
- ✅ `src/pages/Index.tsx` - Messages d'erreur plus clairs
- ✅ `README.md` - Guide de configuration rapide

## 🔄 Déploiement de l'Edge Function

**⚠️ IMPORTANT** : Les modifications de l'Edge Function doivent être déployées sur Supabase pour être actives.

### Option 1 : Déploiement automatique (si configuré)
- Si vous avez configuré le déploiement automatique, les changements seront déployés automatiquement

### Option 2 : Déploiement manuel
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref votre-project-id

# Déployer l'Edge Function
supabase functions deploy analyze-fund
```

## ✅ Vérification

Une fois la clé configurée et l'Edge Function déployée :

1. ✅ L'erreur "API Key not found" ne devrait plus apparaître
2. ✅ Les analyses devraient fonctionner correctement
3. ✅ Vous devriez voir des résultats de sourcing de startups

## 🐛 Si le problème persiste

1. **Vérifiez les logs** dans Supabase Dashboard → Edge Functions → analyze-fund → Logs
2. **Vérifiez que le secret est bien nommé** `GEMINI_API_KEY` (exactement, en majuscules)
3. **Vérifiez que la clé API est valide** sur [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **Attendez 30 secondes** après avoir ajouté le secret
5. **Rafraîchissez complètement** la page (Ctrl+Shift+R)

## 📚 Ressources

- [Guide complet Gemini Setup](./GEMINI_SETUP.md)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google AI Studio](https://makersuite.google.com/app/apikey)

