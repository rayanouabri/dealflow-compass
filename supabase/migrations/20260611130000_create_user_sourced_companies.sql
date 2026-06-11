-- Mémoire de sourcing par utilisateur : sociétés déjà proposées, pour que l'IA
-- ne re-source pas les mêmes lors des runs suivants du même utilisateur.
create table if not exists public.user_sourced_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  domain text,
  pipeline_id uuid,
  sourced_at timestamptz not null default now()
);

create index if not exists idx_usc_user
  on public.user_sourced_companies(user_id, sourced_at desc);

-- Un même utilisateur ne stocke pas deux fois la même société (upsert).
create unique index if not exists uq_usc_user_name
  on public.user_sourced_companies(user_id, name_normalized);

alter table public.user_sourced_companies enable row level security;

-- Lecture limitée à ses propres lignes ; les écritures se font via service role
-- (Edge Function) qui contourne la RLS.
drop policy if exists usc_select_own on public.user_sourced_companies;
create policy usc_select_own on public.user_sourced_companies
  for select using (auth.uid() = user_id);
