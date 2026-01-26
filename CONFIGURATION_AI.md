# Configuration AI — Gemini ou Vertex AI

Ce guide explique comment configurer le provider AI (Gemini ou Vertex AI) et choisir le modèle.

## 📋 Vue d'ensemble

Le système supporte deux providers :
- **Gemini** (par défaut, gratuit via API key)
- **Vertex AI** (Google Cloud, nécessite un projet GCP)

## 🔧 Configuration dans Supabase

Tous les secrets se configurent dans :
**Supabase Dashboard → Edge Functions → [analyze-fund ou ai-qa] → Settings → Secrets**

---

## Option 1 : Gemini (Recommandé pour commencer)

### Secrets requis :

1. **AI_PROVIDER** = `gemini` (ou laissez vide, c'est le défaut)
2. **GEMINI_KEY_2** ou **GEMINI_API_KEY**
   - Obtention : https://makersuite.google.com/app/apikey (gratuit)
   - Exemple : `AIzaSyD...`
3. **GEMINI_MODEL** (optionnel)
   - Défaut : `gemini-2.0-flash`
   - Options disponibles :
     - `gemini-2.0-flash` ⚡ (rapide, recommandé)
     - `gemini-pro` (plus puissant)
     - `gemini-1.5-pro` (très puissant, meilleure qualité)
     - `gemini-1.5-flash` (rapide et efficace)

### Exemple de configuration :

```
AI_PROVIDER = gemini
GEMINI_KEY_2 = AIzaSyD...
GEMINI_MODEL = gemini-2.0-flash
BRAVE_API_KEY = BSAjI6tJ9s5t2qMZZYNTtBDxHQhqVFJ
```

---

## Option 2 : Vertex AI (Google Cloud)

### Prérequis :
- Compte Google Cloud Platform
- Projet GCP avec Vertex AI API activé
- Service Account avec permissions Vertex AI

### Secrets requis :

1. **AI_PROVIDER** = `vertex`
2. **VERTEX_AI_PROJECT_ID**
   - ID du projet GCP (ex: `my-project-123456`)
3. **VERTEX_AI_CREDENTIALS** (JSON)
   - Service Account JSON avec permissions Vertex AI
   - Format : `{"type":"service_account","project_id":"...","private_key":"...",...}`
4. **VERTEX_AI_LOCATION** (optionnel)
   - Défaut : `us-central1`
   - Options : `us-central1`, `us-east1`, `europe-west1`, etc.
5. **VERTEX_AI_MODEL** (optionnel)
   - Défaut : `gemini-pro`
   - Options : `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`

### Exemple de configuration :

```
AI_PROVIDER = vertex
VERTEX_AI_PROJECT_ID = my-project-123456
VERTEX_AI_LOCATION = us-central1
VERTEX_AI_MODEL = gemini-pro
VERTEX_AI_CREDENTIALS = {"type":"service_account","project_id":"my-project-123456",...}
BRAVE_API_KEY = BSAjI6tJ9s5t2qMZZYNTtBDxHQhqVFJ
```

### Comment obtenir VERTEX_AI_CREDENTIALS :

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez ou sélectionnez un projet
3. Activez l'API Vertex AI
4. Créez un Service Account :
   - IAM & Admin → Service Accounts
   - Créez un compte avec le rôle "Vertex AI User"
   - Téléchargez la clé JSON
5. Copiez le contenu JSON dans **VERTEX_AI_CREDENTIALS**

---

## 🔄 Changer de provider

Pour passer de Gemini à Vertex AI (ou vice versa) :

1. Modifiez **AI_PROVIDER** dans les secrets Supabase
2. Ajoutez les secrets correspondants (voir ci-dessus)
3. Redéployez les Edge Functions (ou attendez le prochain déploiement)

---

## 📊 Comparaison des modèles Gemini

| Modèle | Vitesse | Qualité | Coût | Recommandation |
|--------|---------|---------|------|----------------|
| `gemini-2.0-flash` | ⚡⚡⚡ | ⭐⭐⭐ | Gratuit | **Recommandé** - Rapide et efficace |
| `gemini-1.5-flash` | ⚡⚡⚡ | ⭐⭐⭐⭐ | Gratuit | Bon compromis |
| `gemini-pro` | ⚡⚡ | ⭐⭐⭐⭐ | Gratuit | Plus puissant, un peu plus lent |
| `gemini-1.5-pro` | ⚡ | ⭐⭐⭐⭐⭐ | Payant (Vertex) | Meilleure qualité, plus lent |

---

## ⚙️ Configuration actuelle

**Version actuelle utilisée** : `gemini-2.0-flash` (par défaut)

Pour changer le modèle Gemini :
- Ajoutez `GEMINI_MODEL` dans les secrets avec la valeur souhaitée
- Redéployez les Edge Functions

---

## 🚀 Déploiement

Après avoir configuré les secrets, redéployez les fonctions :

```bash
# Si vous avez Supabase CLI configuré
npx supabase functions deploy analyze-fund --no-verify-jwt
npx supabase functions deploy ai-qa --no-verify-jwt
```

Ou via le Dashboard Supabase → Edge Functions → Deploy

---

## ❓ Questions fréquentes

**Q: Quel provider choisir ?**
- **Gemini** : Plus simple, gratuit, parfait pour commencer
- **Vertex AI** : Si vous avez déjà un compte GCP, meilleure intégration entre services

**Q: Quel modèle Gemini choisir ?**
- **gemini-2.0-flash** : Recommandé pour la plupart des cas (rapide et efficace)
- **gemini-1.5-pro** : Si vous avez besoin de meilleure qualité (via Vertex AI)

**Q: Puis-je utiliser Vertex AI avec une clé API ?**
- Non, Vertex AI nécessite un projet GCP et des credentials de service account

**Q: Les deux providers utilisent-ils les mêmes modèles ?**
- Oui, mais l'API est différente. Vertex AI offre parfois des modèles plus récents.

---

## 📝 Notes

- Les secrets doivent être configurés pour **chaque fonction** (analyze-fund et ai-qa)
- Le provider choisi s'applique automatiquement à toutes les fonctions
- Brave Search est requis dans tous les cas (pour les recherches web)
