# 🔧 Fix : "Payment required, please add funds"

## 🎯 Problème

L'erreur **"Payment required, please add funds"** signifie que votre clé API Gemini :
- A épuisé son quota gratuit
- Nécessite l'activation de la facturation sur Google Cloud
- Est liée à un projet Google Cloud qui nécessite un paiement

## ✅ Solutions

### Solution 1 : Générer une Nouvelle Clé API (Recommandé - Gratuit)

1. **Allez sur Google AI Studio** : https://makersuite.google.com/app/apikey
2. **Connectez-vous** avec votre compte Google
3. **Créez un nouveau projet Google Cloud** (ou sélectionnez-en un existant)
   - Cliquez sur "Create API Key"
   - Sélectionnez "Create API key in new project" (gratuit)
4. **Copiez la nouvelle clé API** (commence par `AIza...`)
5. **Remplacez le secret dans Supabase** :
   - Allez sur https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
   - Settings > Secrets
   - Modifiez `GEMINI_API_KEY` avec la nouvelle clé
   - Sauvegardez

### Solution 2 : Activer la Facturation (Si vous voulez garder la même clé)

1. **Allez sur Google Cloud Console** : https://console.cloud.google.com
2. **Sélectionnez votre projet**
3. **Activez la facturation** :
   - Menu > Billing
   - Ajoutez une carte bancaire
   - Activez la facturation pour votre projet
4. **Note** : Gemini API a un **plan gratuit généreux** :
   - 15 requêtes/minute
   - 1,500 requêtes/jour
   - Les premiers $200 de crédits sont gratuits chaque mois

### Solution 3 : Vérifier le Quota de Votre Clé Actuelle

1. **Allez sur Google Cloud Console** : https://console.cloud.google.com
2. **API & Services > Credentials**
3. **Trouvez votre clé API**
4. **Vérifiez les quotas** et l'utilisation

## 🚀 Après Avoir Changé la Clé

1. **Attendez 10-30 secondes** (propagation)
2. **Rafraîchissez votre application** (Ctrl+Shift+R)
3. **Relancez une analyse**

## 💡 Astuce

Pour éviter ce problème à l'avenir :
- Utilisez plusieurs clés API (rotation)
- Surveillez votre utilisation dans Google Cloud Console
- Le plan gratuit Gemini est très généreux (15 req/min, 1500/jour)

## 📚 Ressources

- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Tarifs Gemini API](https://ai.google.dev/pricing)
- [Documentation Gemini](https://ai.google.dev/docs)

