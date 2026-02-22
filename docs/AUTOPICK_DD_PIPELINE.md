# Auto-pick + Due Diligence — Pipeline Async

## Vue d'ensemble

Ce document décrit le pipeline **one-click** qui, depuis la page d'analyse des fonds VC, permet de :

1. **Sourcer** des startups avec un biais France / Francos
2. **Sélectionner automatiquement** la meilleure startup (scoring IA)
3. **Lancer automatiquement** la due diligence complète en 2 phases
4. **Afficher** le rapport final de due diligence

---

## Architecture

```
[Bouton "Auto-pick + Due Diligence"] (Analyser.tsx)
        │
        ▼
[/autopick-progress] (AutopickProgress.tsx)
  ├── Phase 1 : source   → Edge Function autopick-dd?phase=source
  ├── Phase 2 : pick     → Edge Function autopick-dd?phase=pick
  ├── Phase 3 : dd_search  → autopick-dd?phase=dd_search → due-diligence?phase=search
  └── Phase 4 : dd_analyze → autopick-dd?phase=dd_analyze → due-diligence?phase=analyze
        │
        ▼
[/due-diligence/result] (DueDiligenceResult.tsx) — rapport pré-chargé
```

### Statuts du job `sourcing_jobs`

```
pending → analyze_done → picked → dd_search_done → dd_analyze_done
                                                   ↑ (ou error à n'importe quelle étape)
```

Nouveau colonnes dans `sourcing_jobs` :
- `picked_company_name TEXT` — nom de la startup auto-sélectionnée
- `picked_company_url TEXT`  — URL du site web
- `dd_job_id UUID`           — FK vers `due_diligence_jobs`

---

## Edge Function : `autopick-dd`

**URL** : `<SUPABASE_URL>/functions/v1/autopick-dd`  
**Méthode** : POST  
**Auth** : Bearer token (anon ou service role)

### Phase `source`

```json
{
  "phase": "source",
  "fundName": "Partech",
  "customThesis": {
    "sectors": ["IA", "Deeptech"],
    "stage": "seed",
    "geography": "France"
  }
}
```

Réponse :
```json
{ "jobId": "uuid", "status": "analyze_done" }
```

### Phase `pick`

```json
{ "phase": "pick", "jobId": "uuid" }
```

Réponse :
```json
{
  "jobId": "uuid",
  "status": "picked",
  "pickedCompany": { "name": "...", "url": "..." }
}
```

### Phase `dd_search`

```json
{ "phase": "dd_search", "jobId": "uuid" }
```

Réponse :
```json
{ "jobId": "uuid", "ddJobId": "uuid", "status": "dd_search_done" }
```

### Phase `dd_analyze`

```json
{ "phase": "dd_analyze", "jobId": "uuid" }
```

Réponse :
```json
{
  "jobId": "uuid",
  "status": "dd_analyze_done",
  "result": { /* rapport due diligence complet */ }
}
```

---

## Variables d'environnement requises

Ces secrets doivent être configurés dans **Supabase Dashboard > Edge Functions > Secrets** :

| Variable | Obligatoire | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL du projet Supabase (auto-injectée) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role (auto-injectée) |
| `GEMINI_KEY_2` ou `GEMINI_API_KEY` | ✅ (si pas Groq) | Clé API Gemini |
| `GROQ_API_KEY` | ✅ (si pas Gemini) | Clé API Groq |
| `SERPER_API_KEY` ou `serper_api` | Recommandé | Recherche Google via Serper |
| `BRAVE_API_KEY` | Fallback | Brave Search API |

---

## Déploiement

### Déployer la nouvelle Edge Function

```bash
supabase functions deploy autopick-dd --project-ref <PROJECT_REF>
```

### Appliquer la migration DB

```bash
supabase db push --project-ref <PROJECT_REF>
```

Ou via Supabase Dashboard > SQL Editor :

```sql
-- Ajouter les nouvelles colonnes
ALTER TABLE public.sourcing_jobs ADD COLUMN IF NOT EXISTS picked_company_name TEXT;
ALTER TABLE public.sourcing_jobs ADD COLUMN IF NOT EXISTS picked_company_url TEXT;
ALTER TABLE public.sourcing_jobs ADD COLUMN IF NOT EXISTS dd_job_id UUID;

-- Mettre à jour la contrainte de statut
ALTER TABLE public.sourcing_jobs DROP CONSTRAINT IF EXISTS sourcing_jobs_status_check;
ALTER TABLE public.sourcing_jobs ADD CONSTRAINT sourcing_jobs_status_check
  CHECK (status IN (
    'pending', 'fund_done', 'market_done', 'search_done', 'analyze_done',
    'picked', 'dd_search_done', 'dd_analyze_done', 'error'
  ));
```

---

## Exécution locale

```bash
# Démarrer Supabase local
supabase start

# Appliquer les migrations
supabase db reset

# Lancer les Edge Functions localement
supabase functions serve

# Démarrer le frontend
npm run dev
```

Puis accéder à `http://localhost:5173/analyser` et cliquer sur **"Auto-pick + Due Diligence"**.

---

## Biais France / Francos

Le pipeline de sourcing utilise des requêtes optimisées pour l'écosystème francophone :

- **Sources prioritaires** : Maddyness, Les Echos, Bpifrance, French Tech, Station F
- **Labs/Universités** : CNRS, INRIA, Polytechnique, ENS, CentraleSupélec
- **Géographies** : France, Belgique, Suisse, Québec, Maroc, fondateurs français à l'étranger
- **Langue** : Requêtes en français pour les sources FR, en anglais pour les sources internationales

Le scoring IA attribue :
- 35 % au `francophoneScore` (lien avec la France/francophonie)
- 35 % au `thesisFitScore` (adéquation avec la thèse)
- 30 % à l'`evidenceScore` (qualité des preuves)

---

## Notes de sécurité

- L'Edge Function utilise le **service role** pour les écritures en base de données.
- Le frontend utilise la **clé anon** pour appeler la fonction.
- Aucun secret n'est exposé côté client.
- La table `sourcing_jobs` est protégée par RLS (accès uniquement via service role).
