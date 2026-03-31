# 🚀 DealFlow Compass - AI-Powered VC Sourcing

Application d'analyse de startups et de fonds d'investissement utilisant l'IA pour aider les investisseurs dans leurs décisions.

## 🤖 Quels agents IA gratuits utiliser ?

### ✅ Recommandation : **Gemini 2.5-Pro** (GRATUIT)

**Pourquoi Gemini 2.5-Pro ?**
- ✅ **100% Gratuit** via l'API Google AI Studio
- ✅ **Le plus performant** des modèles gratuits disponibles
- ✅ **Facile à configurer** - juste une clé API à obtenir
- ✅ **Pas de compte Google Cloud requis**
- ✅ **Excellente qualité** pour l'analyse de startups

### 📊 Comparaison des agents IA gratuits

| Agent IA | Coût | Performance | Facilité | Recommandé pour |
|----------|------|-------------|----------|-----------------|
| **Gemini 2.5-Pro** | 🟢 Gratuit | ⭐⭐⭐⭐⭐ | ⚡ Très facile | **Analyses complètes** |
| **Gemini 2.0-Flash** | 🟢 Gratuit | ⭐⭐⭐ | ⚡ Très facile | Réponses rapides |
| **Gemini 1.5-Flash** | 🟢 Gratuit | ⭐⭐⭐⭐ | ⚡ Très facile | Bon compromis |
| **Gemini Pro** | 🟢 Gratuit | ⭐⭐⭐⭐ | ⚡ Très facile | Alternative stable |
| Vertex AI | 🟡 Payant | ⭐⭐⭐⭐⭐ | ⚠️ Complexe | Entreprises avec GCP |
| GPT-4 | 🔴 Payant | ⭐⭐⭐⭐⭐ | ⚠️ Coûteux | Budget important |
| Claude | 🔴 Payant | ⭐⭐⭐⭐⭐ | ⚠️ Coûteux | Budget important |

### 🎯 Notre recommandation par cas d'usage

#### 1. **Débutant / Particulier** → Gemini 2.5-Pro
- Configuration en 5 minutes
- Pas de carte bancaire requise
- Performances excellentes

#### 2. **Prototype / MVP** → Gemini 2.0-Flash
- Encore plus rapide
- Idéal pour tester l'application
- Gratuit et simple

#### 3. **Entreprise avec Google Cloud** → Vertex AI
- Si vous avez déjà un compte GCP
- Meilleure intégration
- Facturation consolidée

## 🚀 Démarrage rapide avec Gemini (GRATUIT)

### Étape 1 : Obtenir une clé API Gemini (2 minutes)

1. Allez sur https://makersuite.google.com/app/apikey
2. Cliquez sur "Create API Key"
3. Copiez la clé (format : `AIzaSy...`)

### Étape 2 : Configuration dans Supabase

1. Allez dans le Dashboard Supabase
2. **Edge Functions** → **Settings** → **Secrets**
3. Ajoutez ces variables :

```
GEMINI_KEY_2 = AIzaSy... (votre clé)
GEMINI_MODEL = gemini-2.5-pro
AI_PROVIDER = gemini
```

### Étape 3 : C'est tout ! 🎉

Votre application utilise maintenant **Gemini 2.5-Pro gratuitement** !

## 📖 Documentation détaillée

- [Configuration complète AI](./CONFIGURATION_AI.md) - Tous les providers et modèles
- [Guide Vertex AI](./GUIDE_VERTEX_AI_INTEGRATION.md) - Pour utilisateurs avancés
- [Où trouver le chatbot](./OU_EST_LE_CHATBOT.md) - Guide d'utilisation
- [Vérifier le chatbot](./VERIFIER_CHATBOT.md) - Dépannage

## 🛠️ Technologies

- **Frontend** : React + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase Edge Functions
- **AI** : Gemini (Google AI Studio) - **GRATUIT**
- **Search** : Brave Search API

## 💡 Pourquoi pas d'autres agents IA gratuits ?

### Options gratuites évaluées :

| Agent | Pourquoi PAS recommandé |
|-------|-------------------------|
| ChatGPT Free | ❌ Pas d'API gratuite disponible |
| Claude Free | ❌ Pas d'API gratuite disponible |
| Llama (local) | ❌ Nécessite serveur avec GPU |
| Mistral Free | ⚠️ Limites strictes de rate limiting |
| Groq | ⚠️ Limites de requêtes très basses |

**Conclusion** : Gemini offre le meilleur équilibre entre :
- Gratuité totale
- Performance excellente
- Facilité d'utilisation
- Pas de limites trop restrictives

## 🔐 Sécurité

- Ne partagez jamais vos clés API
- Utilisez les variables d'environnement
- Consultez [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

## 📝 Licence

Ce projet utilise des services IA selon leurs conditions d'utilisation respectives.

---

## ❓ Questions fréquentes

**Q: Gemini est-il vraiment gratuit ?**  
R: Oui ! L'API Gemini via Google AI Studio est gratuite avec des limites généreuses pour un usage normal.

**Q: Puis-je passer de Gemini à Vertex AI plus tard ?**  
R: Absolument ! Il suffit de changer les variables d'environnement. Voir [CONFIGURATION_AI.md](./CONFIGURATION_AI.md).

**Q: Quelle est la limite gratuite de Gemini ?**  
R: Environ 60 requêtes par minute, largement suffisant pour une application de ce type.

**Q: Dois-je payer pour Supabase ?**  
R: Supabase a un plan gratuit généreux. Vous ne payez que si vous dépassez les limites (peu probable au début).

---

**🌟 Astuce** : Commencez avec Gemini 2.5-Pro (gratuit). Si vous avez besoin de plus de performance plus tard, passez à Vertex AI. Mais pour 95% des cas, Gemini gratuit suffit largement !
