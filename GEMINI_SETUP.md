# Configuration Google Gemini API (Gratuit)

## 🎉 Pourquoi Gemini ?

Google Gemini API est **100% gratuit** jusqu'à 15 requêtes par minute, ce qui est largement suffisant pour la plupart des cas d'usage. C'est beaucoup moins cher que Lovable et offre d'excellentes performances.

## 📝 Obtenir votre clé API Gemini (Gratuit)

### Étape 1 : Créer un compte Google AI Studio

1. Allez sur [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"** ou **"Get API Key"**
4. Sélectionnez un projet Google Cloud (ou créez-en un nouveau - c'est gratuit)
5. Votre clé API sera générée automatiquement
6. **Copiez la clé** (elle commence généralement par `AIza...`)

> 💡 **Note** : Le compte Google AI Studio est gratuit et ne nécessite pas de carte bancaire pour commencer.

### Étape 2 : Ajouter le secret dans Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet **"rayanouabri's Project"**
3. Dans le menu de gauche, cliquez sur **"Edge Functions"**
4. Cliquez sur votre fonction **`analyze-fund`**
5. Allez dans l'onglet **"Settings"** ou cherchez **"Secrets"**
6. Cliquez sur **"Add Secret"** ou **"New Secret"**
7. Remplissez :
   - **Nom** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Valeur** : Collez votre clé API Gemini
8. Cliquez sur **"Save"**

### Étape 3 : Mettre à jour votre fichier .env (optionnel)

Si vous testez localement, vous pouvez aussi ajouter la clé dans votre `.env` :

```env
GEMINI_API_KEY=votre_cle_gemini_ici
```

Mais **attention** : cette clé ne doit jamais être commitée dans Git. Elle doit rester dans `.env` qui est dans `.gitignore`.

## ✅ Vérification

Une fois le secret ajouté :

1. **Démarrez votre application** :
   ```bash
   npm run dev
   ```

2. **Testez une analyse** :
   - Ouvrez http://localhost:8080
   - Entrez un nom de fond VC (ex: "Sequoia Capital")
   - Cliquez sur "Analyze"
   - Si tout fonctionne, vous verrez une analyse complète

3. **Vérifiez les logs** (si problème) :
   - Dans Supabase Dashboard > Edge Functions > `analyze-fund` > **Logs**
   - Vous verrez les erreurs éventuelles

## 💰 Coûts

### Plan Gratuit (Free Tier)
- ✅ **15 requêtes par minute** (gratuit)
- ✅ **1,500 requêtes par jour** (gratuit)
- ✅ **Pas de carte bancaire requise**
- ✅ **Parfait pour le développement et les petits projets**

### Plan Payant (si besoin)
- Si vous dépassez les limites gratuites, les prix sont très raisonnables :
  - **$0.00025 par 1K caractères** (input)
  - **$0.0005 par 1K caractères** (output)
  - Beaucoup moins cher que Lovable !

## 🐛 Dépannage

### Erreur : "GEMINI_API_KEY is not configured"
- Vérifiez que vous avez ajouté le secret dans Supabase
- Vérifiez que le nom est exactement `GEMINI_API_KEY` (majuscules)
- Attendez 10-30 secondes après l'ajout (propagation)

### Erreur : "Rate limit exceeded"
- Vous avez dépassé 15 requêtes/minute
- Attendez 1 minute et réessayez
- Ou passez au plan payant si vous avez besoin de plus

### Erreur : "Invalid API key"
- Vérifiez que votre clé API est correcte
- Vérifiez que vous avez bien copié toute la clé (elle est longue)
- Générez une nouvelle clé si nécessaire

## 📚 Ressources

- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Documentation Gemini API](https://ai.google.dev/docs)
- [Tarifs Gemini](https://ai.google.dev/pricing)

## 🔄 Migration depuis Lovable

Si vous aviez déjà configuré Lovable :
1. Remplacez le secret `LOVABLE_API_KEY` par `GEMINI_API_KEY` dans Supabase
2. L'Edge Function a déjà été mise à jour automatiquement
3. C'est tout ! Plus besoin de Lovable.

