# 🚀 Configuration Azure AI (OpenAI)

## 💰 Comparaison des Modèles Azure OpenAI

Pour votre tâche (génération de rapports de due diligence détaillés), voici les options :

### 1. **GPT-4o-mini** ⭐ RECOMMANDÉ
- **Prix** : ~$0.15/$0.60 par 1M tokens (input/output)
- **Avantages** :
  - Excellent rapport qualité/prix
  - Très bon pour les tâches de génération de texte
  - Supporte bien les instructions complexes
  - Génère du JSON structuré de qualité
- **Avec 80€** : ~100-150 analyses complètes
- **Parfait pour** : Votre cas d'usage

### 2. GPT-4o
- **Prix** : ~$2.50/$10 par 1M tokens
- **Avantages** : Meilleure qualité, plus créatif
- **Inconvénients** : 10x plus cher que GPT-4o-mini
- **Avec 80€** : ~10-15 analyses seulement

### 3. GPT-3.5 Turbo
- **Prix** : ~$0.50/$1.50 par 1M tokens
- **Avantages** : Moins cher que GPT-4o-mini
- **Inconvénients** : Moins performant pour les tâches complexes

## 🎯 Recommandation : GPT-4o-mini

**Pourquoi ?**
- Rapport qualité/prix optimal
- Très bon pour générer du contenu structuré et détaillé
- Avec 80€, vous avez largement assez pour développer et tester
- Performance similaire à GPT-4o pour ce type de tâche

## 📝 Configuration Azure OpenAI

### Étape 1 : Créer une ressource Azure OpenAI

1. Allez sur [Azure Portal](https://portal.azure.com)
2. Créez une nouvelle ressource :
   - Cherchez "Azure OpenAI"
   - Cliquez sur "Créer"
   - Remplissez :
     - **Nom** : `dealflow-compass-ai` (ou autre)
     - **Abonnement** : Votre abonnement avec les 80€
     - **Région** : Choisissez la plus proche (ex: `France Central`)
     - **Pricing tier** : Standard
   - Cliquez sur "Créer"

### Étape 2 : Déployer un modèle

1. Une fois la ressource créée, allez dedans
2. Dans le menu de gauche, cliquez sur **"Model deployments"** ou **"Déploiements de modèles"**
3. Cliquez sur **"Create"** ou **"Créer"**
4. Remplissez :
   - **Model name** : `gpt-4o-mini` (ou `gpt-4o` si vous préférez)
   - **Model version** : Laissez la version par défaut
   - **Deployment name** : `gpt-4o-mini` (ou un nom de votre choix)
5. Cliquez sur **"Create"**

### Étape 3 : Obtenir les clés API

1. Dans votre ressource Azure OpenAI
2. Allez dans **"Keys and Endpoint"** ou **"Clés et point de terminaison"**
3. **Copiez** :
   - **KEY 1** (ou KEY 2) : C'est votre clé API
   - **Endpoint** : L'URL de votre ressource (ex: `https://votre-nom.openai.azure.com/`)

### Étape 4 : Ajouter les secrets dans Supabase

1. Allez sur https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund
2. Settings > Secrets
3. Ajoutez/modifiez ces secrets :
   - **AZURE_OPENAI_ENDPOINT** : Votre endpoint (ex: `https://votre-nom.openai.azure.com/`)
   - **AZURE_OPENAI_API_KEY** : Votre clé API
   - **AZURE_OPENAI_DEPLOYMENT_NAME** : Le nom de votre déploiement (ex: `gpt-4o-mini`)

## ✅ Vérification

Une fois configuré :
1. Attendez 10-30 secondes (propagation)
2. Rafraîchissez votre application (Ctrl+Shift+R)
3. Testez une analyse

## 💡 Estimation des Coûts

Pour un rapport complet (1 startup, 8 slides, ~4000 mots) :
- **Input tokens** : ~2000 tokens (prompt)
- **Output tokens** : ~5000 tokens (rapport)
- **Coût par analyse** : ~$0.003 (0.003€)
- **Avec 80€** : ~26,000 analyses ! 🎉

## 📚 Ressources

- [Documentation Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Tarifs Azure OpenAI](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [Guide de déploiement](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource)

