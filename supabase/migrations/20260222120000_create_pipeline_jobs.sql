-- Table orchestrateur : pipeline complet thesis → sourcing → pick → DD
CREATE TABLE IF NOT EXISTS public.pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,

  -- Input
  fund_name text,
  custom_thesis jsonb,

  -- State machine
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'thesis_analyzing',
    'thesis_done',
    'sourcing_running',
    'sourcing_done',
    'picking',
    'pick_done',
    'dd_search_running',
    'dd_search_done',
    'dd_analyze_running',
    'dd_done',
    'error'
  )),
  current_step int NOT NULL DEFAULT 0,
  total_steps int NOT NULL DEFAULT 7,

  -- Intermediate results
  thesis_analysis jsonb,
  sourcing_results jsonb,
  sourcing_job_id uuid,
  picked_startup jsonb,
  dd_job_id uuid,
  final_result jsonb,

  -- Observability
  error_message text,
  error_step text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created ON pipeline_jobs(created_at DESC);

ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role only for pipeline_jobs"
  ON pipeline_jobs FOR ALL
  USING (false)
  WITH CHECK (false);
