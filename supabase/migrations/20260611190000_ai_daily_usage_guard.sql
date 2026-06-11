-- Garde-fou free-tier Gemini : compteur d'appels IA par jour.
-- Toute fonction Edge réserve un appel via increment_ai_usage() AVANT de
-- contacter Gemini ; au-delà du plafond (env AI_DAILY_LIMIT, défaut 240,
-- free tier 2.5-flash = 250/jour) l'app refuse proprement au lieu de
-- dépasser le quota.
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  day date PRIMARY KEY,
  calls int NOT NULL DEFAULT 0
);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_daily FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.ai_usage_daily (day, calls)
  VALUES (current_date, 1)
  ON CONFLICT (day) DO UPDATE SET calls = ai_usage_daily.calls + 1
  RETURNING calls;
$$;

-- Service-role uniquement (appelé depuis les Edge Functions).
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage() FROM anon, authenticated, public;
