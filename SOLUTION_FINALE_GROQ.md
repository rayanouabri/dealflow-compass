# ✅ Solution Finale : Configurer Groq (100% Gratuit)

## 🎯 Le Problème

L'erreur **402 "Payment required, please add funds"** signifie que :
- Soit `GROQ_API_KEY` n'est **PAS configuré** dans Supabase
- Soit la clé Groq est **invalide**

## ✅ Solution en 3 Étapes

### Étape 1 : Obtenir votre Clé API Groq (GRATUIT)

1. **Allez sur** : https://console.groq.com
2. **Créez un compte** (gratuit, pas de carte bancaire)
3. **Générez une clé API** :
   - Cliquez sur "API Keys" dans le menu
   - Cliquez sur "Create API Key"
   - **Copiez la clé** (elle commence par `gsk_...`)
   - ⚠️ **Sauvegardez-la** (elle ne sera affichée qu'une fois)

### Étape 2 : Ajouter le Secret dans Supabase

1. **Allez sur** : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
2. **Settings** > **Secrets**
3. **Supprimez les anciens secrets** (si présents) :
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`
   - `GEMINI_API_KEY`
4. **Ajoutez le nouveau secret** :
   - Cliquez sur **"Add Secret"** ou **"New Secret"**
   - **Nom** : `GROQ_API_KEY` (exactement comme ça, en majuscules)
   - **Valeur** : Votre clé API Groq (commence par `gsk_...`)
   - Cliquez sur **"Save"**

### Étape 3 : Tester

1. **Attendez 30 secondes** (propagation du secret)
2. **Rafraîchissez votre page** (Ctrl+Shift+R pour vider le cache)
3. **Lancez une analyse** (ex: "Sequoia Capital")
4. **Ça devrait fonctionner !** ✅

## 🔍 Vérification

Si ça ne fonctionne toujours pas :

1. **Ouvrez la console** (F12 > Console)
2. **Lancez une analyse**
3. **Regardez le message d'erreur exact**
4. **Dites-moi le message exact** que vous voyez

## 💡 Pourquoi Groq ?

- ✅ **100% GRATUIT** (pas de carte bancaire)
- ✅ **Très rapide**
- ✅ **Parfait pour les étudiants**
- ✅ **Limite généreuse** : ~30 requêtes/minute

---

**Une fois `GROQ_API_KEY` configuré, tout devrait fonctionner !** 🚀

