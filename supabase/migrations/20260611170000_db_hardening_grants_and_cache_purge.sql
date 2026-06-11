-- Durcissement DB (audit 2026-06-11)
-- 1) Tables internes (accès service-role uniquement depuis les Edge Functions) :
--    on retire les grants API. La RLS bloquait déjà les lignes, mais le schéma
--    restait découvrable via GraphQL/REST avec l'anon key (advisors 0026/0027).
REVOKE ALL ON public.pipeline_jobs FROM anon, authenticated;
REVOKE ALL ON public.sourcing_jobs FROM anon, authenticated;
REVOKE ALL ON public.due_diligence_jobs FROM anon, authenticated;
REVOKE ALL ON public.search_cache FROM anon, authenticated;

-- 2) Tables utilisateur : seuls les comptes connectés (authenticated) les
--    requêtent via le client — l'anon n'a aucune raison de les voir.
REVOKE ALL ON public.analysis_history FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_sourced_companies FROM anon;

-- 3) handle_new_user : fonction trigger SECURITY DEFINER (advisors 0028/0029).
--    Elle n'est appelée que par le trigger sur auth.users — jamais via l'API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 4) Purge quotidienne du cache de recherche expiré (TTL 14 j) : la table ne
--    grossit plus indéfiniment.
SELECT cron.schedule(
  'purge-search-cache',
  '17 3 * * *',
  $$DELETE FROM public.search_cache WHERE expires_at < now()$$
);
