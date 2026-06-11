-- Le sweep cron scanne les jobs non terminaux par updated_at toutes les minutes.
-- Index partiel : ne couvre que les jobs actifs (poignée de lignes), le scan
-- reste O(actifs) même quand la table accumule l'historique.
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_active_updated
  ON public.pipeline_jobs (updated_at)
  WHERE status NOT IN ('dd_done', 'error');
