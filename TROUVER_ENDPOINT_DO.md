# Comment trouver la bonne URL de l'endpoint DigitalOcean Agent

## 🔍 Le problème

L'erreur `404 - Not Found` signifie que l'URL de l'endpoint est incorrecte.

## ✅ Solution : Trouver la bonne URL

### Option 1 : Via le Dashboard DigitalOcean (recommandé)

1. Va sur ton agent `vc-sourcing-ninja` dans DigitalOcean
2. Clique sur l'onglet **"Settings"** (en haut)
3. Cherche la section **"Endpoint"** ou **"API Endpoint"**
4. Tu devrais voir :
   - Soit une URL complète du type : `https://api.digitalocean.com/v2/agents/AGENT_ID/invoke`
   - Soit juste l'ID de l'agent
   - Soit une URL du type : `https://xxx.agents.do-ai.run`

### Option 2 : Via "Endpoint Access Keys"

1. Dans l'onglet **"Settings"** de ton agent
2. Va dans **"Endpoint Access Keys"** ou **"API Keys"**
3. Clique sur **"Create endpoint access key"** (si tu ne l'as pas déjà fait)
4. Tu verras l'URL de l'endpoint dans la documentation ou les exemples

### Option 3 : Format standard DigitalOcean

Si tu as l'ID de ton agent (visible dans l'URL du dashboard), l'endpoint devrait être :

```
https://api.digitalocean.com/v2/agents/{AGENT_ID}/invoke
```

Remplace `{AGENT_ID}` par l'ID réel de ton agent.

## 📝 Format à mettre dans Supabase

Dans Supabase Dashboard → Edge Functions → Settings → Secrets :

**Nom** : `DO_AGENT_ENDPOINT`  
**Valeur** : L'URL complète, par exemple :
- `https://api.digitalocean.com/v2/agents/327850ca-0690-11f1-b074-4e013e2ddde4/invoke`
- OU `https://kgkfvc43edurttme3bxzt4kh.agents.do-ai.run/invoke` (si c'est ce format)

## ⚠️ Important

- L'URL doit commencer par `https://`
- Si l'URL se termine par `.agents.do-ai.run`, ajoute `/invoke` à la fin
- Pas d'espaces avant/après l'URL

## 🧪 Test

Une fois l'URL corrigée, relance une analyse et vérifie les logs Supabase. Tu devrais voir :
- `[DO Agent] Appel à l'endpoint: https://...`
- Plus d'erreur 404
