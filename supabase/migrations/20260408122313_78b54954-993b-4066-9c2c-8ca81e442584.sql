-- Table for distributed rate limiting across edge function instances
CREATE TABLE public.edge_function_rate_limits (
  rate_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_rate_limits_window ON public.edge_function_rate_limits(window_start);

-- RPC function for atomic rate limit check
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_window_interval INTERVAL := (p_window_ms || ' milliseconds')::INTERVAL;
BEGIN
  -- Try to get existing record
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM edge_function_rate_limits
  WHERE rate_key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First request for this key
    INSERT INTO edge_function_rate_limits (rate_key, request_count, window_start)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (rate_key) DO UPDATE SET request_count = 1, window_start = v_now;
    RETURN FALSE;
  END IF;

  IF v_now - v_window_start > v_window_interval THEN
    -- Window expired, reset
    UPDATE edge_function_rate_limits
    SET request_count = 1, window_start = v_now
    WHERE rate_key = p_key;
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE edge_function_rate_limits
  SET request_count = request_count + 1
  WHERE rate_key = p_key;

  RETURN (v_count + 1) > p_max_requests;
END;
$$;

-- Cleanup function for expired entries (call via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(p_max_age_ms INTEGER DEFAULT 300000)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM edge_function_rate_limits
  WHERE window_start < now() - (p_max_age_ms || ' milliseconds')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- No RLS needed — this table is only accessed via service_role from edge functions
-- and via SECURITY DEFINER functions