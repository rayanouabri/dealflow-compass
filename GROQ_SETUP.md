# 🚀 Configuration Groq API (GRATUIT pour Étudiants)

## 🎉 Pourquoi Groq ?

- ✅ **100% GRATUIT** (pas de carte bancaire requise)
- ✅ **Très rapide** (inference ultra-rapide)
- ✅ **Excellent pour JSON** (parfait pour votre cas)
- ✅ **Limite généreuse** : ~30 requêtes/minute
- ✅ **Parfait pour étudiants**

## 📝 Obtenir votre Clé API Groq (GRATUIT)

### Étape 1 : Créer un compte

1. Allez sur : https://console.groq.com
2. Cliquez sur **"Sign Up"** ou **"Get Started"**
3. Créez un compte (gratuit, pas de carte bancaire)

### Étape 2 : Générer une Clé API

1. Une fois connecté, allez dans **"API Keys"** ou **"Keys"**
2. Cliquez sur **"Create API Key"** ou **"Generate Key"**
3. **Copiez la clé** (elle commence par `gsk_...`)
4. ⚠️ **Sauvegardez-la** (elle ne sera affichée qu'une fois)

### Étape 3 : Ajouter le Secret dans Supabase

1. Allez sur : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
2. Settings > Secrets
3. Ajoutez/modifiez :
   - **Nom** : `GROQ_API_KEY`
   - **Valeur** : Votre clé API Groq (commence par `gsk_...`)
4. (Optionnel) Ajoutez aussi :
   - **Nom** : `GROQ_MODEL`
   - **Valeur** : `llama-3.1-70b-versatile` (ou `llama-3.1-8b-instant` pour plus rapide)

### Étape 4 : Tester

1. Attendez 10-30 secondes (propagation)
2. Rafraîchissez votre application (Ctrl+Shift+R)
3. Lancez une analyse

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

## 💰 Coûts

**GRATUIT** ! Pas de limite de temps, pas de carte bancaire.

Limites :
- ~30 requêtes/minute (gratuit)
- Suffisant pour développer et tester

## ✅ Vérification

Une fois configuré :
1. Le code utilise automatiquement Groq
2. Plus besoin d'Azure OpenAI
3. Tout fonctionne gratuitement !

## 🐛 Dépannage

### Erreur : "GROQ_API_KEY not configured"
- Vérifiez que le secret est bien ajouté dans Supabase
- Vérifiez que le nom est exactement `GROQ_API_KEY` (majuscules)

### Erreur : "Rate limit exceeded"
- Attendez 1 minute et réessayez
- Limite : ~30 requêtes/minute (gratuit)

### Erreur : "Invalid API key"
- Vérifiez que votre clé est correcte
- Générez une nouvelle clé sur https://console.groq.com

## 📚 Ressources

- [Groq Console](https://console.groq.com)
- [Documentation Groq](https://console.groq.com/docs)
- [Modèles disponibles](https://console.groq.com/docs/models)

---

**C'est tout ! Groq est 100% gratuit et parfait pour les étudiants.** 🎓

