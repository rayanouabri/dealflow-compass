# Guide : Edge Functions et Configuration des Secrets

## 🤔 Qu'est-ce qu'une Edge Function ?

Une **Edge Function** est une fonction serverless qui s'exécute sur les serveurs de Supabase (à la "edge" du réseau, proche des utilisateurs). C'est comme une API backend mais qui tourne directement sur l'infrastructure Supabase.

### Pourquoi utiliser une Edge Function ?

Dans votre application DealFlow Compass, l'Edge Function `analyze-fund` :
- ✅ Reçoit le nom d'un fonds VC depuis votre application frontend
- ✅ Appelle l'API Google Gemini (GRATUIT) pour analyser le fonds et trouver des startups
- ✅ Retourne un rapport de due diligence complet
- ✅ S'exécute de manière sécurisée (les clés API restent côté serveur)

### Architecture

```
Frontend (React) 
    ↓ (appelle)
Edge Function "analyze-fund" 
    ↓ (utilise)
Google Gemini API (GRATUIT)
    ↓ (retourne)
Rapport de due diligence
```

## 🔐 Pourquoi un secret est nécessaire ?

Le secret `GEMINI_API_KEY` contient votre clé API Google Gemini. Cette clé doit rester **secrète** et ne jamais être exposée dans le code frontend. C'est pourquoi elle est stockée comme "secret" dans Supabase.

## 📝 Comment ajouter le secret GEMINI_API_KEY

### Étape 1 : Obtenir votre clé API Gemini (GRATUIT)

1. Allez sur [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"** ou **"Get API Key"**
4. Sélectionnez un projet Google Cloud (ou créez-en un nouveau - gratuit)
5. Votre clé API sera générée automatiquement
6. **Copiez la clé** (elle commence par `AIza...`)

> 💡 **Note** : Google Gemini API est **100% gratuit** jusqu'à 15 requêtes/minute. Pas besoin de carte bancaire !

### Étape 2 : Ajouter le secret dans Supabase

#### Option A : Via le Dashboard Supabase (Recommandé)

1. **Allez sur le Dashboard Supabase**
   - Ouvrez [https://app.supabase.com](https://app.supabase.com)
   - Connectez-vous à votre compte
   - Sélectionnez votre projet : **"rayanouabri's Project"**

2. **Naviguez vers Edge Functions**
   - Dans le menu de gauche, cliquez sur **"Edge Functions"**
   - Vous devriez voir votre fonction `analyze-fund` listée

3. **Accédez aux Secrets**
   - Cliquez sur **"Settings"** ou **"⚙️ Settings"** en haut à droite
   - Ou cherchez un onglet **"Secrets"** dans la page Edge Functions
   - Ou cliquez directement sur votre fonction `analyze-fund` puis cherchez **"Secrets"**

4. **Ajoutez le secret**
   - Cliquez sur **"Add Secret"** ou **"New Secret"**
   - **Nom du secret** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Valeur** : Collez votre clé API Gemini
   - Cliquez sur **"Save"** ou **"Add"**

#### Option B : Via Supabase CLI (Avancé)

Si vous avez installé Supabase CLI :

```bash
# Se connecter à Supabase
supabase login

# Lier votre projet
supabase link --project-ref bdsetpsitqhzpnitxibo

# Ajouter le secret
supabase secrets set LOVABLE_API_KEY=votre_cle_api_lovable_ici
```

### Étape 3 : Vérifier que le secret est bien configuré

1. Dans le Dashboard Supabase, allez dans **Edge Functions** > **Settings** > **Secrets**
2. Vous devriez voir `GEMINI_API_KEY` listé (la valeur sera masquée pour la sécurité)

## 🧪 Tester que tout fonctionne

Une fois le secret ajouté, testez votre Edge Function :

1. **Démarrez votre application** :
   ```bash
   npm run dev
   ```

2. **Ouvrez** http://localhost:8080

3. **Testez une analyse** :
   - Entrez un nom de fond VC (ex: "Sequoia Capital")
   - Cliquez sur "Analyze"
   - Si tout fonctionne, vous devriez voir une analyse complète

4. **Si ça ne fonctionne pas**, vérifiez les logs :
   - Dans Supabase Dashboard > Edge Functions > `analyze-fund` > **Logs**
   - Vous verrez les erreurs éventuelles

## 🐛 Dépannage

### Erreur : "GEMINI_API_KEY is not configured"

**Cause** : Le secret n'a pas été ajouté ou le nom est incorrect.

**Solution** :
- Vérifiez que le secret s'appelle exactement `GEMINI_API_KEY` (majuscules)
- Vérifiez que vous avez bien sauvegardé le secret
- Attendez quelques secondes après l'ajout (la propagation peut prendre 10-30 secondes)

### Erreur : "Rate limit exceeded"

**Cause** : Vous avez dépassé 15 requêtes/minute (limite du plan gratuit).

**Solution** :
- Attendez 1 minute et réessayez
- Le plan gratuit permet 15 requêtes/minute et 1,500 requêtes/jour
- Si vous avez besoin de plus, passez au plan payant (très abordable)

### Erreur : "Failed to parse AI response"

**Cause** : L'API Lovable a retourné une réponse dans un format inattendu.

**Solution** :
- Vérifiez les logs de l'Edge Function dans Supabase
- Vérifiez que votre clé API Lovable est valide

## 📚 Ressources

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Gestion des secrets dans Supabase](https://supabase.com/docs/guides/functions/secrets)
- [Lovable AI Documentation](https://lovable.dev/docs)

## 💡 Astuce

Pour voir les logs de votre Edge Function en temps réel :
1. Allez dans Supabase Dashboard > Edge Functions > `analyze-fund`
2. Cliquez sur l'onglet **"Logs"**
3. Vous verrez tous les appels et erreurs en temps réel

