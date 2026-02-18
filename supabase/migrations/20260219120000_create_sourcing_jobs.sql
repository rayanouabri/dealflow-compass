-- Table pour stocker le contexte de recherche du Sourcing (2 phases comme Due Diligence)
create table if not exists public.sourcing_jobs (
  id uuid primary key default gen_random_uuid(),
  fund_name text,
  custom_thesis jsonb,
  params jsonb not null default '{}',
  search_context jsonb,
  search_results_count int,
  status text not null default 'pending' check (status in ('pending', 'search_done', 'analyze_done', 'error')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sourcing_jobs_created_at on public.sourcing_jobs(created_at);
create index if not exists idx_sourcing_jobs_status on public.sourcing_jobs(status);

alter table public.sourcing_jobs enable row level security;

-- Accès uniquement via service_role (Edge Function)
drop policy if exists "Allow all sourcing_jobs" on public.sourcing_jobs;
create policy "Service role only for sourcing_jobs"
  on public.sourcing_jobs
  for all
  using (false)
  with check (false);

comment on table public.sourcing_jobs is 'Jobs Sourcing 2 phases: search_context from phase 1, result from phase 2 (évite 546)';
