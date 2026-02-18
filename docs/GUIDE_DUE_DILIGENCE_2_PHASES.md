# Guide : Due Diligence en 2 phases (contourner la limite 150s Supabase)

## Objectif

- **Contourner** la limite de 150 secondes (wall clock) des Edge Functions Supabase sans payer.
- **Maximiser** la qualité : plus de requêtes de recherche, plus de résultats par catégorie, meilleure analyse.

## Principe

La limite s’applique **par invocation**. En découpant en 2 appels :

| Phase   | Rôle                    | Durée cible | Limite 150s |
|--------|--------------------------|-------------|-------------|
| **1 – Search**  | Recherches Serper + sauvegarde du contexte | ~60–120s | ✅ |
| **2 – Analyze** | Chargement contexte + appel IA + réponse  | ~60–120s | ✅ |

Chaque appel reste sous 150s, le flux global peut dépasser 150s sans erreur 546.

---

## Architecture

```
[Client]  --(1) POST phase=search, companyName, ...-->  [Edge Function due-diligence]
                                                              |
                                                              v
                                                    Recherches Serper (nombreuses)
                                                              |
                                                              v
                                                    Sauvegarde contexte en DB (job_id)
                                                              |
[Client]  <--(2) { jobId } -----------------------------------+

[Client]  --(3) POST phase=analyze, jobId ------------------> [Edge Function due-diligence]
                                                              |
                                                              v
                                                    Chargement contexte depuis DB
                                                              |
                                                              v
                                                    Appel IA (Gemini/Vertex) → rapport
                                                              |
[Client]  <--(4) { rapport JSON } ----------------------------+
```

---

## 1. Stockage (Supabase)

### Table `due_diligence_jobs`

Stocke le contexte de recherche et le résultat par job.

| Colonne           | Type      | Description |
|-------------------|-----------|-------------|
| `id`              | `uuid` PK | Identifiant du job (= `job_id` renvoyé au client). |
| `company_name`    | `text`    | Nom de l’entreprise. |
| `company_website` | `text`    | Site web optionnel. |
| `additional_context` | `text` | Contexte optionnel. |
| `search_context`  | `text`    | Contexte brut des recherches (texte envoyé à l’IA). |
| `search_results_count` | `int` | Nombre de résultats dédupliqués. |
| `status`         | `text`    | `search_done` \| `analyze_done` \| `error`. |
| `result`         | `jsonb`   | Rapport final (une fois phase 2 terminée). |
| `error_message`   | `text`    | Message d’erreur si `status = error`. |
| `created_at`      | `timestamptz` | Création. |
| `updated_at`      | `timestamptz` | Dernière mise à jour. |

- RLS : autoriser lecture/écriture pour les utilisateurs authentifiés (ou anon si pas d’auth) selon ta politique.
- Nettoyage : supprimer les lignes de plus de 24h pour ne pas encombrer la base.

---

## 2. API Edge Function `due-diligence`

Même URL, comportement selon le body.

### Phase 1 – Search

**Request**

```json
{
  "phase": "search",
  "companyName": "Morfo",
  "companyWebsite": "https://www.morfo.rest",
  "additionalContext": ""
}
```

**Response (200)**

```json
{
  "jobId": "uuid-du-job",
  "status": "search_done",
  "searchResultsCount": 176
}
```

**Comportement**

1. Valider `companyName`.
2. Exécuter **toutes** les requêtes Serper (voir section « Tuning »).
3. Dédupliquer, catégoriser, construire `search_context` (texte).
4. Insérer une ligne dans `due_diligence_jobs` : `status = 'search_done'`, `search_context` et `search_results_count` remplis.
5. Répondre avec `jobId`, `status`, `searchResultsCount`.

Aucun appel IA dans cette phase → on peut augmenter le nombre de requêtes et la taille du contexte sans dépasser 150s.

### Phase 2 – Analyze

**Request**

```json
{
  "phase": "analyze",
  "jobId": "uuid-du-job"
}
```

**Response (200)**

```json
{
  "company": { ... },
  "executiveSummary": { ... },
  "product": { ... },
  ...
}
```

(Le rapport complet comme aujourd’hui.)

**Comportement**

1. Charger la ligne `due_diligence_jobs` par `id = jobId`.
2. Vérifier `status = 'search_done'` (sinon 400).
3. Appeler l’IA avec `search_context` (et le prompt système existant).
4. Parser, post-traiter (strip inline sources, etc.), mettre à jour la ligne : `result`, `status = 'analyze_done'`.
5. Répondre avec le `result` (rapport JSON).

En cas d’erreur : mettre `status = 'error'`, `error_message`, et répondre 500 avec le message.

---

## 3. Frontend (`DueDiligenceResult.tsx`)

### Flux

1. **Appel 1 – Search**  
   - `POST /functions/v1/due-diligence` avec `{ phase: "search", companyName, companyWebsite, additionalContext }`.  
   - Afficher par ex. « Recherche en cours… » (progress 0–50 %).  
   - Réponse : `{ jobId }`.

2. **Appel 2 – Analyze**  
   - `POST /functions/v1/due-diligence` avec `{ phase: "analyze", jobId }`.  
   - Afficher « Analyse IA en cours… » (progress 50–100 %).  
   - Réponse : rapport JSON → `setData(result)`, progress 100 %.

Timeouts : par ex. 90s pour la phase 1, 120s pour la phase 2 (chaque appel reste sous 150s).

### Gestion d’erreurs

- Phase 1 en erreur : afficher le message, proposer « Réessayer ».
- Phase 2 en erreur : le job reste en `search_done` ; on peut proposer « Relancer l’analyse » (réutiliser le même `jobId`) sans refaire les recherches.

---

## 4. Tuning : maximiser recherches et qualité (phase 1)

Comme la phase 1 ne fait plus l’IA, tu peux :

- **Augmenter le nombre de requêtes** : remettre (ou ajouter) des requêtes retirées pour la limite 150s (ex. 35–45 requêtes).
- **Augmenter les résultats par requête** : `RESULTS_PER_QUERY = 20` ou `25` (Serper accepte souvent jusqu’à 30).
- **Garder un délai raisonnable entre batches** : ex. 700–800 ms pour éviter le rate limit Serper, tout en restant sous 150s pour la phase 1.
- **Augmenter les limites par catégorie** dans `buildSearchContext()` : ex. 40, 35, 30, 25, 25, 25, 20, 10, 10 (ou plus). Le contexte sera plus long mais uniquement lu en phase 2 (pas de Serper dans la phase 2).

Objectif phase 1 : rester **sous ~140s** pour laisser une marge (recherches + écriture DB + overhead). Ajuster le nombre de requêtes et le délai entre batches en conséquence.

---

## 5. Tuning : phase 2

- Pas de changement côté « recherche » : tout vient de la DB.
- Tu peux laisser le prompt système et le post-traitement tels quels.
- Si le rapport est trop gros et que la phase 2 approche 150s, réduire un peu les limites de catégories (moins de texte dans `search_context`) ou raccourcir le prompt.

---

## 6. Résumé des étapes d’implémentation

1. **Migration** : créer la table `due_diligence_jobs` (voir schéma ci‑dessus).
2. **Edge Function** :  
   - Lire `phase` dans le body.  
   - Si `phase === 'search'` : faire uniquement recherche + sauvegarde + retour `jobId`.  
   - Si `phase === 'analyze'` : charger par `jobId`, appeler l’IA, mettre à jour et retourner le rapport.
3. **Frontend** : deux `fetch` successifs (search puis analyze), avec messages de progression et gestion d’erreurs par phase.
4. **Optionnel** : cron ou job pour supprimer les lignes `due_diligence_jobs` de plus de 24h.

---

## 7. Référence rapide

| Élément        | Phase 1 (Search)     | Phase 2 (Analyze)      |
|----------------|----------------------|-------------------------|
| Body           | `phase`, `companyName`, … | `phase`, `jobId`   |
| Réponse        | `jobId`, `searchResultsCount` | Rapport JSON complet |
| Timeout client | 90–120s              | 120s                    |
| Limite 150s    | Recherches + DB      | Lecture DB + IA + DB    |

Une fois ce flux en place, tu peux augmenter fortement le nombre de recherches et la richesse du contexte sans rencontrer la limite 150s.

---

## 8. Implémentation réalisée

- **Table** : `public.due_diligence_jobs` (migration appliquée).
- **Edge Function** : `due-diligence` accepte `phase: "search"` (body : companyName, …) ou `phase: "analyze"` (body : jobId). Phase search fait les recherches et enregistre le contexte ; phase analyze charge le job et appelle l’IA.
- **Frontend** : `DueDiligenceResult.tsx` enchaîne les deux appels (search → récupère `jobId` → analyze avec `jobId` → affiche le rapport).

Pour **maximiser les recherches** sans dépasser 150s en phase 1, dans `supabase/functions/due-diligence/index.ts` tu peux :
- Augmenter le tableau `searchQueries` (ajouter des requêtes ciblées).
- Augmenter `RESULTS_PER_QUERY` (ex. 20) et ajuster `BATCH_DELAY_MS` (ex. 700) si besoin.
- Dans `buildSearchContext()`, augmenter les limites passées à `addCategory()` (ex. 35, 30, 25, …) pour envoyer plus de contexte à l’IA en phase 2.
