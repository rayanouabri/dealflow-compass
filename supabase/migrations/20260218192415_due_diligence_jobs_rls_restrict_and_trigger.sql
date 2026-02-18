do $$
begin
  drop policy if exists "Allow anon and authenticated to manage due_diligence_jobs" on public.due_diligence_jobs;
exception when undefined_object then null;
end $$;

create or replace function public.due_diligence_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_due_diligence_jobs_updated_at on public.due_diligence_jobs;
create trigger set_due_diligence_jobs_updated_at
  before update on public.due_diligence_jobs
  for each row execute function public.due_diligence_jobs_updated_at();
