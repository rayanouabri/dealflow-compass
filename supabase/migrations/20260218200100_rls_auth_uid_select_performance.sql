-- (select auth.uid()) pour éviter ré-évaluation par ligne (performance RLS)
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles for select using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles for update using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile" on public.user_profiles for insert with check ((select auth.uid()) = id);

drop policy if exists "Users can view own analyses" on public.analysis_history;
create policy "Users can view own analyses" on public.analysis_history for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own analyses" on public.analysis_history;
create policy "Users can insert own analyses" on public.analysis_history for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own analyses" on public.analysis_history;
create policy "Users can delete own analyses" on public.analysis_history for delete using ((select auth.uid()) = user_id);
