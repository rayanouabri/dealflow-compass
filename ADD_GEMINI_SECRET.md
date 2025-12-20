# ✅ Votre clé API Gemini a été configurée localement

Votre fichier `.env` local contient maintenant votre clé API Gemini.

## 🔐 Ajouter le secret dans Supabase (2 minutes)

Pour que l'Edge Function fonctionne en production, vous devez ajouter le secret dans Supabase :

### Étapes rapides :

1. **Ouvrez** [https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund](https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund)

2. **Cliquez sur "Settings"** ou cherchez l'onglet **"Secrets"**

3. **Cliquez sur "Add Secret"** ou **"New Secret"**

4. **Remplissez** :
   - **Nom** : `GEMINI_API_KEY`
   - **Valeur** : `AIzaSyDum1TiEMtDv9TgmpkgiOwV_AAO0GOPa4s`

5. **Cliquez sur "Save"**

### ✅ C'est tout !

Une fois le secret ajouté, votre Edge Function pourra utiliser Gemini API.

## 🧪 Tester

```bash
npm run dev
```

Puis testez avec un nom de fond VC (ex: "Sequoia Capital")

