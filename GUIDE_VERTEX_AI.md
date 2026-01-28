# 🚀 Guide Simple : Activer Vertex AI

Vertex AI permet d'utiliser Gemini avec des fonctionnalités avancées comme la recherche Google (Grounding) pour améliorer les analyses.

## ✅ Étapes Simples (5 minutes)

### 1. Créer un Service Account dans Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez ou créez un projet
3. Activez l'API Vertex AI :
   - Menu ☰ → **APIs & Services** → **Library**
   - Cherchez "Vertex AI API"
   - Cliquez sur **Enable**

### 2. Créer un Service Account

1. Menu ☰ → **IAM & Admin** → **Service Accounts**
2. Cliquez sur **+ CREATE SERVICE ACCOUNT**
3. Remplissez :
   - **Name** : `vertex-ai-service` (ou autre nom)
   - **Description** : `Service account pour Vertex AI`
4. Cliquez sur **CREATE AND CONTINUE**
5. Dans **Grant this service account access to project** :
   - Rôle : **Vertex AI User**
   - Cliquez sur **CONTINUE** puis **DONE**

### 3. Télécharger la Clé JSON

1. Cliquez sur le service account créé
2. Onglet **KEYS**
3. **ADD KEY** → **Create new key**
4. Sélectionnez **JSON**
5. Cliquez sur **CREATE** (le fichier JSON se télécharge)

### 4. Configurer dans Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. **Edge Functions** → **analyze-fund** → **Settings** → **Secrets**
4. Ajoutez ces secrets :

```
AI_PROVIDER = vertex
VERTEX_AI_PROJECT_ID = votre-project-id (ex: my-project-123456)
VERTEX_AI_LOCATION = us-central1 (ou europe-west1 si vous êtes en Europe)
VERTEX_AI_MODEL = gemini-1.5-pro (recommandé pour Vertex AI)
VERTEX_AI_CREDENTIALS = {copiez tout le contenu du fichier JSON téléchargé}
```

**Important pour VERTEX_AI_CREDENTIALS** :
- Ouvrez le fichier JSON téléchargé
- Copiez **TOUT** le contenu (de `{` jusqu'à `}`)
- Collez-le dans le champ secret (sur une seule ligne)

### 5. Répéter pour ai-qa

Faites la même chose pour la fonction **ai-qa** :
- **Edge Functions** → **ai-qa** → **Settings** → **Secrets**
- Ajoutez les mêmes secrets

### 6. Redéployer (optionnel)

Les fonctions se mettront à jour automatiquement, mais vous pouvez forcer un redéploiement :

```bash
supabase functions deploy analyze-fund
supabase functions deploy ai-qa
```

## 🎯 Avantages de Vertex AI

- ✅ **Recherche Google intégrée** (Grounding) - meilleures données à jour
- ✅ **Modèles plus récents** (gemini-1.5-pro, etc.)
- ✅ **Meilleure intégration** avec les services Google Cloud
- ✅ **Quotas plus élevés** pour les projets GCP

## 🔍 Vérifier que ça marche

1. Lancez une analyse sur votre site
2. Si vous voyez une erreur, vérifiez :
   - Que l'API Vertex AI est bien activée
   - Que le Service Account a le rôle "Vertex AI User"
   - Que les secrets sont correctement copiés (surtout VERTEX_AI_CREDENTIALS)

## ❓ Problèmes courants

**Erreur "Invalid credentials"** :
- Vérifiez que VERTEX_AI_CREDENTIALS contient bien tout le JSON (sur une ligne)
- Vérifiez que le Service Account a le rôle "Vertex AI User"

**Erreur "Project not found"** :
- Vérifiez que VERTEX_AI_PROJECT_ID est correct (pas le nom, mais l'ID du projet)

**Erreur "API not enabled"** :
- Activez l'API Vertex AI dans Google Cloud Console

## 📝 Modèles disponibles avec Vertex AI

- `gemini-1.5-pro` ⭐ (recommandé - très puissant)
- `gemini-1.5-flash` (rapide)
- `gemini-pro` (standard)

Pour utiliser un modèle spécifique, ajoutez :
```
VERTEX_AI_MODEL = gemini-1.5-pro
```

---

**C'est tout !** Vertex AI est maintenant configuré et prêt à améliorer vos analyses. 🎉
