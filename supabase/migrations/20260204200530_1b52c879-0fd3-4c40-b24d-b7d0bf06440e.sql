-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, endpoint, window_start);

-- Auto-cleanup old records (older than 24 hours)
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Enable RLS but allow service role full access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access
CREATE POLICY "Service role only"
  ON public.rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_record_id UUID;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check for existing record in current window
  SELECT id, request_count INTO v_record_id, v_current_count
  FROM rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_record_id IS NULL THEN
    -- No recent record, create new one
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now());
    
    RETURN QUERY SELECT true, p_max_requests - 1, now() + (p_window_minutes || ' minutes')::INTERVAL;
  ELSIF v_current_count >= p_max_requests THEN
    -- Rate limit exceeded
    RETURN QUERY 
    SELECT false, 0, 
      (SELECT rl.window_start + (p_window_minutes || ' minutes')::INTERVAL 
       FROM rate_limits rl WHERE rl.id = v_record_id);
  ELSE
    -- Increment counter
    UPDATE rate_limits 
    SET request_count = request_count + 1
    WHERE id = v_record_id;
    
    RETURN QUERY 
    SELECT true, p_max_requests - v_current_count - 1,
      (SELECT rl.window_start + (p_window_minutes || ' minutes')::INTERVAL 
       FROM rate_limits rl WHERE rl.id = v_record_id);
  END IF;
END;
$$;

-- Cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;