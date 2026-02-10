# Configuration DigitalOcean Agent

Ce guide explique comment configurer l'agent DigitalOcean GenAI pour améliorer le sourcing et la due diligence.

## 📋 Prérequis

1. ✅ Agent DigitalOcean créé et **ACTIVE**
2. ✅ **Endpoint URL** obtenue (ex: `https://api.digitalocean.com/v1/agents/xxx/invoke`)
3. ✅ **API Key** obtenue (endpoint access key)

## 🔧 Configuration dans Supabase

### Étape 1 : Ajouter les secrets

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionne ton projet
3. Va dans **Edge Functions** → **Settings** → **Secrets**
4. Ajoute ces **2 secrets** :

| Nom du Secret | Valeur | Description |
|---------------|--------|-------------|
| `DO_AGENT_ENDPOINT` | `https://api.digitalocean.com/v1/agents/xxx/invoke` | URL complète de ton endpoint agent |
| `DO_AGENT_API_KEY` | `ta-clé-daccès` | La clé d'API (Bearer token) |

⚠️ **Important** : Remplace `xxx` par l'ID réel de ton agent dans l'URL.

### Étape 2 : Activer l'agent (optionnel)

Par défaut, l'agent DigitalOcean est **désactivé**. Pour l'activer :

1. Ajoute un secret supplémentaire :
   - Nom : `USE_DO_AGENT`
   - Valeur : `true`

Ou laisse-le vide/défini à `false` pour continuer à utiliser Gemini/Vertex AI.

## 🎯 Utilisation

### Mode Hybride (recommandé)

L'agent DigitalOcean peut être utilisé **en complément** de Gemini/Vertex AI :

- **DigitalOcean Agent** : Sourcing approfondi, recherche web, détection signaux faibles
- **Gemini/Vertex AI** : Analyse structurée, génération de rapports JSON

### Mode Agent uniquement

Si tu veux utiliser **uniquement** l'agent DigitalOcean :

1. Définis `USE_DO_AGENT=true`
2. L'agent sera utilisé pour le sourcing ET l'analyse

## 📝 Format des réponses

L'agent DigitalOcean retourne du **texte structuré** (pas du JSON). 

Les fonctions existantes (`analyze-fund`, `due-diligence`) vont :
1. Appeler l'agent pour obtenir les données brutes
2. Parser la réponse textuelle
3. Optionnellement : utiliser Gemini/Vertex AI pour structurer en JSON si besoin

## 🔍 Où trouver l'Endpoint et la Clé

### Endpoint URL

1. Va sur ton agent dans DigitalOcean Dashboard
2. Clique sur **"Agent endpoint docs"** ou **"Endpoint"**
3. Tu verras l'URL complète, du type :
   ```
   https://api.digitalocean.com/v1/agents/AGENT_ID/invoke
   ```

### API Key

1. Dans l'onglet **"Endpoint"** ou **"Access Keys"**
2. Clique sur **"Create endpoint access key"**
3. Donne-lui un nom (ex: `vc-sourcing-key`)
4. **Copie la clé immédiatement** (elle ne sera plus visible après)

## 🧪 Test

Pour tester que tout fonctionne :

1. Va dans **Edge Functions** → `analyze-fund` → **Logs**
2. Lance une analyse depuis l'app
3. Vérifie les logs pour voir si l'agent est appelé

## ⚙️ Configuration avancée

### Utiliser l'agent uniquement pour le sourcing

Si tu veux que l'agent fasse **uniquement le sourcing** et que Gemini fasse l'analyse :

1. Ajoute le secret : `DO_AGENT_FOR_SOURCING_ONLY=true`

### Désactiver l'agent temporairement

1. Supprime ou définis `USE_DO_AGENT=false`
2. Le système reviendra automatiquement à Gemini/Vertex AI

## 🐛 Dépannage

### Erreur "Configuration DigitalOcean Agent manquante"

- Vérifie que `DO_AGENT_ENDPOINT` et `DO_AGENT_API_KEY` sont bien définis
- Vérifie qu'il n'y a pas d'espaces avant/après les valeurs

### Erreur 401 Unauthorized

- Vérifie que ta clé API est correcte
- Vérifie que la clé n'a pas expiré (crée-en une nouvelle si besoin)

### Erreur 404 Not Found

- Vérifie que l'URL de l'endpoint est correcte
- Vérifie que ton agent est bien **ACTIVE** dans DigitalOcean

### L'agent ne répond pas

- Vérifie les logs DigitalOcean pour voir les erreurs
- Vérifie que tu as assez de crédits/quota sur ton compte DigitalOcean

## 💰 Coûts

L'agent DigitalOcean utilise **Claude Opus 4** par défaut :
- **Input** : $15.00 / 1M tokens
- **Output** : $75.00 / 1M tokens

**Estimation** :
- 1 requête de sourcing (~2000 tokens input, ~5000 tokens output) ≈ **$0.40**
- 1 due diligence complète (~5000 tokens input, ~15000 tokens output) ≈ **$1.20**

💡 **Astuce** : Surveille l'onglet "Agent Daily Token Usage" dans DigitalOcean pour suivre les coûts.
