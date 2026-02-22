-- Add columns needed for the full auto-pick + due diligence pipeline
alter table public.sourcing_jobs add column if not exists picked_company_name text;
alter table public.sourcing_jobs add column if not exists picked_company_url text;
alter table public.sourcing_jobs add column if not exists dd_job_id uuid;

-- Extend status enum to cover the full pipeline
-- pending -> analyze_done -> picked -> dd_search_done -> dd_analyze_done (+ error)
alter table public.sourcing_jobs drop constraint if exists sourcing_jobs_status_check;
alter table public.sourcing_jobs add constraint sourcing_jobs_status_check
  check (status in (
    'pending',
    'fund_done',
    'market_done',
    'search_done',
    'analyze_done',
    'picked',
    'dd_search_done',
    'dd_analyze_done',
    'error'
  ));

comment on column public.sourcing_jobs.picked_company_name is 'Name of the startup auto-selected by the pipeline';
comment on column public.sourcing_jobs.picked_company_url  is 'Website URL of the auto-selected startup';
comment on column public.sourcing_jobs.dd_job_id           is 'FK to due_diligence_jobs for the auto-run DD job';
