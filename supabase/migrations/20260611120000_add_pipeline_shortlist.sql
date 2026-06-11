-- Shortlist multi-startups : conserve toutes les startups scorées par le
-- picking (pas seulement la n°1), avec leur analyse qualitative, pour un
-- affichage "plusieurs startups d'un coup".
alter table public.pipeline_jobs
  add column if not exists shortlist jsonb;
