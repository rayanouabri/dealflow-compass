# Pipeline Orchestrator — Documentation

## Architecture

```
Frontend (Analyser.tsx)
        │
        │  POST action:"start"
        ▼
┌─────────────────────────────────────────────────────────┐
│              pipeline-orchestrator                       │
│                                                          │
│  start ──► crée pipeline_jobs (thesis_analyzing)        │
│             fire-and-forget self-invocation              │
│                                                          │
│  continue ──► dispatch selon status                      │
│   ┌── thesis_analyzing  ──► handleThesisAnalysis        │
│   ├── thesis_done       ──► handleSourcingStart         │
│   ├── sourcing_running  ──► handleSourcingStart (retry) │
│   ├── sourcing_done     ──► handlePicking               │
│   ├── picking           ──► handlePicking (retry)       │
│   ├── pick_done         ──► handleDDSearch              │
│   ├── dd_search_running ──► handleDDSearch (retry)      │
│   ├── dd_search_done    ──► handleDDAnalyze             │
│   └── dd_analyze_running──► handleDDAnalyze (retry)     │
│                                                          │
│  status ──► retourne état courant (polling front)        │
└─────────────────────────────────────────────────────────┘
        │                              │
        │                              │
        ▼                              ▼
  due-diligence             _shared modules
  Edge Function         ┌── ai-client.ts
  (phase search         ├── search-client.ts
   + analyze)           ├── sourcing-queries-fr.ts
                        ├── dedup-ranker.ts
                        ├── scoring-engine.ts
                        └── prompts/thesis-analysis.ts
```

## Machine d'états

```
pending
  └─► thesis_analyzing
        └─► thesis_done
              └─► sourcing_running
                    └─► sourcing_done
                          └─► picking
                                └─► pick_done
                                      └─► dd_search_running
                                            └─► dd_search_done
                                                  └─► dd_analyze_running
                                                        └─► dd_done
                                                  (error si retry_count >= max_retries)
```

- Chaque étape peut retomber en `error` si `retry_count >= max_retries` (défaut: 3)
- En cas d'échec intermédiaire, le job garde son status actuel et `retry_count` est incrémenté
- Un backoff exponentiel est appliqué entre les retries : `2^retry_count * 1000ms`

## API Reference

### POST `/functions/v1/pipeline-orchestrator`

#### Action : `start`

Lance un nouveau pipeline.

**Body :**
```json
{
  "action": "start",
  "fundName": "Accel",
  "customThesis": {
    "sectors": ["deeptech", "SaaS"],
    "stage": "seed",
    "geography": "France"
  }
}
```

**Réponse :**
```json
{ "pipelineId": "uuid" }
```

---

#### Action : `continue`

Fait avancer le pipeline d'une étape. Utilisé en interne (self-invocation).

**Body :**
```json
{ "action": "continue", "pipelineId": "uuid" }
```

**Réponse :**
```json
{ "ok": true }
```

---

#### Action : `status`

Retourne l'état courant du pipeline (pour le polling frontend).

**Body :**
```json
{ "action": "status", "pipelineId": "uuid" }
```

**Réponse :**
```json
{
  "id": "uuid",
  "status": "sourcing_running",
  "currentStep": 2,
  "totalSteps": 7,
  "pickedStartup": null,
  "errorMessage": null,
  "ddJobId": null,
  "completedAt": null,
  "thesisSummary": {
    "sectors": ["deeptech"],
    "stage": { "min": "seed", "max": "serie-a" },
    "geography": { "primary": "France", "frenchBias": true }
  },
  "createdAt": "...",
  "startedAt": "..."
}
```

## Variables d'environnement requises

| Variable | Description | Requis |
|---|---|---|
| `SUPABASE_URL` | URL du projet Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase | ✅ |
| `AI_PROVIDER` | `gemini` (défaut) ou `groq` ou `vertex` | - |
| `GEMINI_API_KEY` / `GEMINI_KEY_2` | Clé API Google Gemini | ✅ (si gemini) |
| `GROQ_API_KEY` | Clé API Groq | ✅ (si groq) |
| `VERTEX_AI_PROJECT_ID` | ID projet GCP | ✅ (si vertex) |
| `VERTEX_AI_LOCATION` | Région Vertex (ex: `us-central1`) | - |
| `VERTEX_AI_TOKEN` | Token OAuth2 Vertex | ✅ (si vertex) |
| `BRAVE_API_KEY` | Clé API Brave Search | Recommandé |
| `SERPER_API_KEY` | Clé API Serper (Google Search) | Recommandé |

> Au moins un provider IA et un provider de recherche sont requis.

## Comment tester localement

### Prérequis
- Supabase CLI installé : `npm install -g supabase`
- Variables d'environnement dans un fichier `.env.local`

### Démarrer les Edge Functions localement

```bash
supabase start
supabase functions serve pipeline-orchestrator --env-file .env.local
```

### Lancer un pipeline de test

```bash
curl -X POST http://localhost:54321/functions/v1/pipeline-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "action": "start",
    "fundName": "Accel Partners"
  }'
```

### Vérifier le statut

```bash
curl -X POST http://localhost:54321/functions/v1/pipeline-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "action": "status",
    "pipelineId": "<pipelineId>"
  }'
```

## Estimation des coûts

Par run complet du pipeline :

| Étape | Appels API | Coût estimé |
|---|---|---|
| Thesis analysis | 1 appel IA | ~0.001$ |
| Sourcing | ~70 requêtes Brave/Serper | ~0.07$ |
| Picking (top 10) | 10 appels IA | ~0.01$ |
| DD Search | ~50 requêtes Brave/Serper | ~0.05$ |
| DD Analyze | 1 appel IA (gros) | ~0.05$ |
| **Total** | | **~0.18$ / run** |

> Les coûts varient selon les providers choisis (Groq est gratuit jusqu'à un certain quota).

## Notes techniques

- **Timeout** : chaque step doit compléter en < 120s (timeout Edge Function = 150s)
- **Idempotence** : les retries reprennent la même étape sans dupliquer les données
- **Self-invocation** : le pattern fire-and-forget via `fetch` évite le blocage
- **RLS** : `pipeline_jobs` est service_role only — le frontend interroge via l'action `status`
