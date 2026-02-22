-- Fix: les policies USING(false) WITH CHECK(false) peuvent bloquer les INSERTs/UPDATEs
-- du service_role dans certaines configurations Supabase.
-- RLS activé + aucune policy = seul service_role peut accéder (via BYPASSRLS) — c'est plus propre.

DROP POLICY IF EXISTS "Service role only for due_diligence_jobs"
  ON public.due_diligence_jobs;

DROP POLICY IF EXISTS "Service role only for sourcing_jobs"
  ON public.sourcing_jobs;

-- RLS reste activé sur les deux tables — pas besoin de policies explicites
-- car service_role a l'attribut BYPASSRLS et peut accéder sans policy.
