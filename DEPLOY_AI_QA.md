# Guide de Déploiement - Assistant IA Q&A

## ✅ Configuration terminée

Vous avez configuré le secret `GEMINI_KEY_2` dans Supabase. Le code est prêt à être déployé.

## 🚀 Déploiement de la fonction Edge Function

### Option 1 : Via Supabase CLI (recommandé)

```bash
# Depuis la racine du projet
supabase functions deploy ai-qa
```

### Option 2 : Via Supabase Dashboard

1. Allez dans **Supabase Dashboard** → **Edge Functions**
2. Cliquez sur **Deploy a new function**
3. Sélectionnez le dossier `supabase/functions/ai-qa`
4. Ou utilisez l'interface pour uploader le fichier `index.ts`

## ✅ Vérification

Après le déploiement, vérifiez que :

1. La fonction `ai-qa` apparaît dans la liste des Edge Functions
2. Le secret `GEMINI_KEY_2` est bien configuré dans les Settings → Secrets
3. Testez en utilisant l'Assistant IA dans l'application

## 🧪 Test rapide

Une fois déployé, vous pouvez tester directement depuis l'application :

1. Lancez une analyse de startup
2. Dans les résultats, cliquez sur l'onglet **"Assistant IA"**
3. Posez une question comme : "Quelle est la stratégie de croissance de cette entreprise ?"

## 📝 Notes

- La fonction utilise `GEMINI_KEY_2` comme nom de secret
- Si vous avez des erreurs, vérifiez les logs dans **Supabase Dashboard** → **Edge Functions** → **ai-qa** → **Logs**
- La fonction supporte aussi `GROQ_API_KEY` en fallback si Gemini n'est pas disponible

## 🔧 Dépannage

Si vous rencontrez des erreurs :

1. **Erreur "No AI provider configured"**
   - Vérifiez que `GEMINI_KEY_2` est bien ajouté dans les Secrets
   - Redéployez la fonction après avoir ajouté le secret

2. **Erreur 403 ou "Invalid API key"**
   - Vérifiez que votre clé Gemini est valide
   - Vérifiez que vous avez des crédits/quota disponibles sur Google Cloud

3. **Erreur CORS**
   - Normalement géré automatiquement par les headers CORS dans le code
   - Vérifiez que l'URL de votre application est autorisée

