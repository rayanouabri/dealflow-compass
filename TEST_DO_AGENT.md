# Test de l'Agent DigitalOcean

## ✅ Déploiement terminé

Les fonctions suivantes ont été déployées avec l'intégration DigitalOcean Agent :
- ✅ `analyze-fund` (version mise à jour)
- ✅ `due-diligence` (version mise à jour)
- ✅ `_shared/digitalocean-agent.ts` (helper partagé)

## 🧪 Comment tester

### Option 1 : Test via l'interface web (recommandé)

1. **Va sur ton site** : `https://ai-vc-sourcing.vercel.app`
2. **Teste le sourcing** :
   - Va sur `/analyser`
   - Entre un fond VC ou une thèse personnalisée
   - Lance l'analyse
   - Vérifie que l'agent DigitalOcean est utilisé (regarde les logs Supabase)

3. **Teste la Due Diligence** :
   - Va sur `/due-diligence`
   - Entre un nom d'entreprise (ex: "Mistral AI")
   - Lance l'analyse
   - Vérifie que l'agent enrichit les résultats

### Option 2 : Vérifier les logs Supabase

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions)
2. Clique sur `analyze-fund` ou `due-diligence`
3. Va dans l'onglet **Logs**
4. Lance une analyse depuis l'app
5. Tu devrais voir dans les logs :
   ```
   Using DigitalOcean Agent for sourcing...
   DigitalOcean Agent sourcing completed
   ```
   ou
   ```
   Using DigitalOcean Agent for due diligence...
   DigitalOcean Agent due diligence completed
   ```

### Option 3 : Test direct via curl (avancé)

```bash
# Test sourcing
curl -X POST https://anxyjsgrittdwrizqcgi.supabase.co/functions/v1/analyze-fund \
  -H "Authorization: Bearer TON_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fundName": "Accel",
    "params": {
      "numberOfStartups": 1
    }
  }'
```

## 🔍 Vérifications

### ✅ Secrets configurés ?

Vérifie dans Supabase Dashboard → Edge Functions → Settings → Secrets :
- `DO_AGENT_ENDPOINT` : doit être l'URL complète de ton endpoint
- `DO_AGENT_API_KEY` : doit être ta clé d'accès
- `USE_DO_AGENT` : doit être `true` pour activer l'agent

### ✅ Agent DigitalOcean actif ?

1. Va sur DigitalOcean Dashboard
2. Vérifie que ton agent est **ACTIVE** (pas "Deploying")
3. Vérifie qu'il n'y a pas d'erreurs dans les logs DigitalOcean

### ✅ Erreurs possibles

Si tu vois dans les logs Supabase :
- `"Configuration DigitalOcean Agent manquante"` → Vérifie les secrets
- `"401 Unauthorized"` → Vérifie ta clé API
- `"404 Not Found"` → Vérifie l'URL de l'endpoint
- `"DigitalOcean Agent failed, falling back to standard sourcing"` → L'agent a échoué mais le système continue avec Brave Search + Gemini

## 📊 Résultats attendus

Avec l'agent DigitalOcean activé, tu devrais voir :

1. **Sourcing amélioré** :
   - Plus de startups trouvées
   - Meilleure détection des signaux faibles
   - Sources plus variées (pas juste Crunchbase)

2. **Due Diligence enrichie** :
   - Analyse plus approfondie
   - Plus de sources citées
   - Meilleure détection des risques/opportunités

3. **Dans les logs** :
   - Messages de succès de l'agent
   - Pas d'erreurs 401/404

## 🐛 Dépannage

### L'agent n'est pas appelé

1. Vérifie que `USE_DO_AGENT=true` dans les secrets
2. Vérifie les logs Supabase pour voir les erreurs
3. Vérifie que l'agent DigitalOcean est ACTIVE

### L'agent échoue silencieusement

1. Vérifie les logs DigitalOcean pour voir les erreurs côté agent
2. Vérifie que tu as assez de crédits/quota
3. Vérifie que le modèle (Claude Opus) est bien configuré

### Les résultats ne sont pas meilleurs

1. Vérifie que l'agent est bien appelé (logs)
2. Vérifie les instructions de l'agent dans DigitalOcean
3. L'agent peut prendre du temps - vérifie que la réponse est complète

## 💰 Coûts

Chaque appel à l'agent coûte environ :
- Sourcing : ~$0.40 par requête
- Due Diligence : ~$1.20 par requête

Surveille l'onglet "Agent Daily Token Usage" dans DigitalOcean.
