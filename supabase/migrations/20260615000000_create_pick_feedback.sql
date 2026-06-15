-- Feedback explicite des utilisateurs sur les picks du pipeline (👍 / 👎).
-- 👎 : exclusion dure des runs futurs. 👍 : exemples few-shot pour la thèse.
create table if not exists public.pick_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  pipeline_id uuid,
  company_name text not null,
  verdict text not null check (verdict in ('up','down')),
  created_at timestamptz not null default now(),
  constraint pick_feedback_user_company_uniq unique (user_id, company_name)
);

alter table public.pick_feedback enable row level security;

drop policy if exists pick_feedback_own on public.pick_feedback;
create policy pick_feedback_own on public.pick_feedback
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists pick_feedback_user_verdict_idx
  on public.pick_feedback (user_id, verdict);
