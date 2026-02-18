-- Table pour stocker le contexte de recherche et le résultat par job (2 phases due diligence)
create table if not exists public.due_diligence_jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_website text,
  additional_context text,
  search_context text,
  search_results_count int,
  status text not null default 'search_done' check (status in ('search_done', 'analyze_done', 'error')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_due_diligence_jobs_created_at on public.due_diligence_jobs(created_at);
create index if not exists idx_due_diligence_jobs_status on public.due_diligence_jobs(status);

alter table public.due_diligence_jobs enable row level security;

create policy "Allow anon and authenticated to manage due_diligence_jobs"
  on public.due_diligence_jobs
  for all
  using (true)
  with check (true);

comment on table public.due_diligence_jobs is 'Jobs due diligence 2 phases: search_context from phase 1, result from phase 2';
