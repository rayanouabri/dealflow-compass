-- P1: Move trial credits to server-side (Supabase RLS protected)
-- P6: Add Stripe subscription support

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_credits_remaining INT DEFAULT 3;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';
-- free, starter ($99/mo = 50 analyses), professional ($399/mo = unlimited)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT NULL;
-- active, trial_active, canceled, past_due
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;

-- Track API usage for rate-limiting
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name VARCHAR(100),
  usage_date DATE,
  call_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, function_name, usage_date)
);

-- RLS for api_usage
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own api_usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Decrement trial credits atomically
CREATE OR REPLACE FUNCTION decrement_trial_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles
  SET trial_credits_remaining = trial_credits_remaining - 1
  WHERE id = p_user_id
    AND trial_credits_remaining > 0
    AND subscription_tier = 'free'
    AND (subscription_status IS NULL OR subscription_status = 'trial_active');
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can make API call
CREATE OR REPLACE FUNCTION can_make_api_call(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier VARCHAR;
  v_status VARCHAR;
  v_credits INT;
BEGIN
  SELECT subscription_tier, subscription_status, trial_credits_remaining
  INTO v_tier, v_status, v_credits
  FROM user_profiles
  WHERE id = p_user_id;
  
  IF v_tier = 'free' THEN
    RETURN v_credits > 0 AND (v_status IS NULL OR v_status = 'trial_active');
  ELSIF v_tier IN ('starter', 'professional') THEN
    RETURN v_status = 'active' AND subscription_ends_at > NOW();
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stripe_events table for webhooks
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  event_type VARCHAR(100),
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for frequent queries
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, usage_date DESC);
CREATE INDEX idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed, created_at DESC);
