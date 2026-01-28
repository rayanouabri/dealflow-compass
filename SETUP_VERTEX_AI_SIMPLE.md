# 🚀 Configuration Vertex AI - Guide Ultra Simple

## ⚡ Méthode la Plus Simple (5 minutes)

### Étape 1 : Google Cloud Console

1. Allez sur https://console.cloud.google.com/
2. Créez ou sélectionnez un projet
3. Activez Vertex AI API :
   - Menu ☰ → **APIs & Services** → **Library**
   - Cherchez "Vertex AI API" → **Enable**

### Étape 2 : Service Account

1. Menu ☰ → **IAM & Admin** → **Service Accounts**
2. **+ CREATE SERVICE ACCOUNT**
3. Nom : `vertex-ai` → **CREATE AND CONTINUE**
4. Rôle : **Vertex AI User** → **CONTINUE** → **DONE**
5. Cliquez sur le service account créé
6. Onglet **KEYS** → **ADD KEY** → **Create new key** → **JSON**
7. Le fichier JSON se télécharge automatiquement

### Étape 3 : Trouver le PROJECT_ID

**Méthode la plus simple** :
1. Dans Google Cloud Console, en haut à gauche, cliquez sur le **nom de votre projet**
2. Un menu s'ouvre → Le **Project ID** est affiché (ex: `my-project-123456`)
3. **Copiez ce Project ID** (pas le nom, mais l'ID)

**Alternative** :
- Menu ☰ → **IAM & Admin** → **Settings**
- Le **Project ID** est affiché en haut

📖 **Guide détaillé** : Voir `TROUVER_PROJECT_ID.md`

### Étape 4 : Supabase Secrets

1. https://supabase.com/dashboard → Votre projet
2. **Edge Functions** → **analyze-fund** → **Settings** → **Secrets**
3. Ajoutez ces 5 secrets :

```
AI_PROVIDER = vertex
VERTEX_AI_PROJECT_ID = votre-project-id (ex: my-project-123456)
VERTEX_AI_LOCATION = us-central1
VERTEX_AI_MODEL = gemini-2.5-pro
VERTEX_AI_CREDENTIALS = {copiez tout le JSON ici}
```

**Pour VERTEX_AI_PROJECT_ID** :
- C'est l'ID du projet trouvé à l'Étape 3 (pas le nom du projet)
- Exemple : `dealflow-ai-789012`

**Pour VERTEX_AI_MODEL** :
- `gemini-2.5-pro` ⭐ (recommandé - très puissant)
- `gemini-3.0-pro` (essayez si disponible - peut ne pas être accessible partout)
- `gemini-1.5-pro` (alternative stable)

**Pour VERTEX_AI_CREDENTIALS** :
- Ouvrez le fichier JSON téléchargé à l'Étape 2
- Copiez **TOUT** le contenu (de `{` à `}`)
- Collez dans le secret (sur une seule ligne)

### Étape 5 : Répéter pour ai-qa

Même chose pour **ai-qa** :
- **Edge Functions** → **ai-qa** → **Settings** → **Secrets**
- Ajoutez les mêmes 5 secrets

## ✅ C'est tout !

Vertex AI est maintenant configuré. Les analyses utiliseront automatiquement Vertex AI au lieu de Gemini API.

## 🎯 Avantages

- ✅ Recherche Google intégrée (Grounding)
- ✅ Modèles plus récents (gemini-2.5-pro, gemini-3.0-pro)
- ✅ Meilleures performances
- ✅ Quotas plus élevés

## 🔍 Tester

Lancez une analyse sur votre site. Si ça fonctionne, Vertex AI est actif ! 🎉
