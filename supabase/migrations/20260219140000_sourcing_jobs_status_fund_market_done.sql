-- Ajouter fund_done et market_done pour le flux 4 phases (éviter 546)
alter table public.sourcing_jobs drop constraint if exists sourcing_jobs_status_check;
alter table public.sourcing_jobs add constraint sourcing_jobs_status_check
  check (status in ('pending', 'fund_done', 'market_done', 'search_done', 'analyze_done', 'error'));
