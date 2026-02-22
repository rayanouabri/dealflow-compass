-- Fix: current policy allows anyone to read/write all DD jobs
DROP POLICY IF EXISTS "Allow anon and authenticated to manage due_diligence_jobs"
  ON public.due_diligence_jobs;

CREATE POLICY "Service role only for due_diligence_jobs"
  ON public.due_diligence_jobs
  FOR ALL
  USING (false)
  WITH CHECK (false);
