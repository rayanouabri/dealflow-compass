# 🚀 Configuration Groq API (GRATUIT - Alternative à Gemini)

## ✅ Pourquoi Groq ?

- ✅ **100% GRATUIT** (pas de carte bancaire requise)
- ✅ **Très rapide** (inference ultra-rapide)
- ✅ **Excellent pour JSON** (parfait pour votre cas)
- ✅ **Limite généreuse** : ~30 requêtes/minute
- ✅ **Plus simple** que Gemini

## 📝 Étape 1 : Obtenir une Clé API Groq (GRATUIT)

1. **Allez sur** : [https://console.groq.com](https://console.groq.com)
2. **Cliquez sur "Sign Up"** ou **"Get Started"**
3. **Créez un compte** (gratuit, pas de carte bancaire)
4. **Une fois connecté**, allez dans **"API Keys"** (menu de gauche)
5. **Cliquez sur "Create API Key"**
6. **Copiez la clé** (elle commence par `gsk_...`)
   - ⚠️ **Sauvegardez-la** (elle ne sera affichée qu'une fois !)

## 🔐 Étape 2 : Ajouter le Secret dans Supabase

1. **Allez dans Supabase Dashboard** : [https://app.supabase.com](https://app.supabase.com)
2. **Sélectionnez votre projet** : "rayanouabri's Project"
3. **Allez dans "Secrets"** (menu de gauche, sous "Functions")
4. **Cliquez sur "Add Secret"**
5. **Remplissez** :
   - **Name** : `GROQ_API_KEY` (exactement comme ça, en majuscules)
   - **Value** : Votre clé API Groq (commence par `gsk_...`)
6. **Cliquez sur "Save"**

### Optionnel : Choisir le Modèle

Si vous voulez utiliser un modèle spécifique, ajoutez aussi :

- **Name** : `GROQ_MODEL`
- **Value** : `llama-3.1-70b-versatile` (recommandé)
  - Ou `llama-3.1-8b-instant` (plus rapide)
  - Ou `mixtral-8x7b-32768` (très bon pour JSON)

## 🔄 Étape 3 : Redéployer la Fonction

**⚠️ IMPORTANT** : Après avoir ajouté le secret, redéployez la fonction !

1. **Allez dans** : **Edge Functions** → `analyze-fund`
2. **Cliquez sur l'onglet "Code"**
3. **Copiez-collez** le nouveau code depuis `supabase/functions/analyze-fund/index.ts`
4. **Cliquez sur "Deploy"**

## ✅ Étape 4 : Tester

1. **Attendez 10-30 secondes** (propagation)
2. **Retournez dans votre application** (localhost:8080)
3. **Rafraîchissez la page** (Ctrl+Shift+R)
4. **Testez une analyse** :
   - Entrez "Sequoia Capital"
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner maintenant ! 🎉

## 🎯 Modèles Disponibles

### Recommandé : `llama-3.1-70b-versatile`
- **Meilleure qualité** pour votre cas d'usage
- **Excellent pour JSON** structuré
- **Bon équilibre** vitesse/qualité

### Alternative : `llama-3.1-8b-instant`
- **Plus rapide**
- **Moins puissant** mais suffisant
- **Parfait si vous voulez de la vitesse**

### Autres options :
- `mixtral-8x7b-32768` (très bon pour JSON)
- `llama-3-70b-8192`

## 💡 Comment ça fonctionne maintenant ?

L'Edge Function supporte maintenant **deux providers** :

1. **Groq** (priorité) - Si `GROQ_API_KEY` existe, utilise Groq
2. **Gemini** (fallback) - Si seulement `GEMINI_API_KEY` existe, utilise Gemini

**Vous pouvez avoir les deux configurés**, Groq sera utilisé en priorité.

## 🆘 Dépannage

### Erreur : "No AI provider configured"
- Vérifiez que `GROQ_API_KEY` ou `GEMINI_API_KEY` existe dans Secrets
- Vérifiez que le nom est exactement en majuscules

### Erreur : "Invalid API key"
- Vérifiez que votre clé Groq commence par `gsk_...`
- Vérifiez que vous avez bien copié toute la clé

### Erreur : "Rate limit exceeded"
- Attendez 1 minute et réessayez
- Groq gratuit : ~30 requêtes/minute

## 📚 Ressources

- [Console Groq](https://console.groq.com)
- [Documentation Groq](https://console.groq.com/docs)
- [Modèles disponibles](https://console.groq.com/docs/models)

---

**C'est tout ! Groq est maintenant configuré et prêt à l'emploi ! 🚀**

