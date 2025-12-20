# 🆓 Alternatives Gratuites pour Étudiants

## 🏆 Option 1 : Groq API (RECOMMANDÉ) ⭐

### Pourquoi Groq ?
- ✅ **100% GRATUIT** (pas de carte bancaire requise)
- ✅ **Très rapide** (inference ultra-rapide)
- ✅ **Excellent pour JSON** (supporte bien les réponses structurées)
- ✅ **Modèles puissants** : LLaMA 3, Mixtral, etc.
- ✅ **Limite généreuse** : ~30 requêtes/minute gratuitement
- ✅ **Parfait pour étudiants**

### Modèles Disponibles :
- `llama-3.1-70b-versatile` (recommandé pour votre cas)
- `llama-3.1-8b-instant` (plus rapide, moins puissant)
- `mixtral-8x7b-32768` (très bon pour JSON)

### Configuration :
1. Créez un compte sur : https://console.groq.com
2. Générez une clé API (gratuite)
3. Ajoutez `GROQ_API_KEY` dans Supabase Secrets

---

## 🥈 Option 2 : Hugging Face Inference API

### Avantages :
- ✅ **Gratuit** avec limites raisonnables
- ✅ **Beaucoup de modèles** disponibles
- ✅ **Pas de carte bancaire** pour commencer

### Inconvénients :
- ⚠️ Plus lent que Groq
- ⚠️ Limites de rate plus strictes

### Configuration :
1. Créez un compte sur : https://huggingface.co
2. Générez un token : Settings > Access Tokens
3. Ajoutez `HUGGINGFACE_API_KEY` dans Supabase Secrets

---

## 🥉 Option 3 : Together AI

### Avantages :
- ✅ **Crédits gratuits** pour commencer
- ✅ **Modèles performants**
- ✅ **Bon support JSON**

### Inconvénients :
- ⚠️ Nécessite une carte bancaire (mais crédits gratuits)
- ⚠️ Limites après crédits gratuits

---

## 🎯 Recommandation : Groq

**Pourquoi Groq est le meilleur choix :**
1. **100% gratuit** sans carte bancaire
2. **Très rapide** (inference en millisecondes)
3. **Excellent pour JSON** (votre cas d'usage)
4. **Limite généreuse** (30 req/min)
5. **Facile à configurer**

---

## 📝 Migration vers Groq

Je vais modifier l'Edge Function pour utiliser Groq. C'est la solution la plus simple et la plus rapide pour vous.

