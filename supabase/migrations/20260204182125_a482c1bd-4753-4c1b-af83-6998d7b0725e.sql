-- Create parental_consent_requests table
CREATE TABLE public.parental_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID NOT NULL,
  parent_email TEXT NOT NULL,
  consent_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'revoked')),
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  email_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  
  -- Change limiting (3 changes per 24h window)
  request_count INTEGER DEFAULT 1,
  first_request_at TIMESTAMPTZ DEFAULT now(),
  
  -- Parent account linking (optional)
  parent_user_id UUID,
  
  UNIQUE(child_user_id, parent_email)
);

-- Index for token lookups
CREATE INDEX idx_consent_token ON parental_consent_requests(consent_token);

-- Index for parent email limits (max 10 children per email)
CREATE INDEX idx_parent_email ON parental_consent_requests(parent_email);

-- Index for child user lookups
CREATE INDEX idx_consent_child_user ON parental_consent_requests(child_user_id);

-- RLS Policies
ALTER TABLE parental_consent_requests ENABLE ROW LEVEL SECURITY;

-- Children can view their own consent requests
CREATE POLICY "Users can view their own consent requests"
  ON parental_consent_requests FOR SELECT
  USING (auth.uid() = child_user_id);

-- Children can create consent requests for themselves
CREATE POLICY "Users can create their own consent requests"
  ON parental_consent_requests FOR INSERT
  WITH CHECK (auth.uid() = child_user_id);

-- Children can update their own pending requests (email change)
CREATE POLICY "Users can update their own pending consent requests"
  ON parental_consent_requests FOR UPDATE
  USING (auth.uid() = child_user_id AND status = 'pending');

-- Admins can view all
CREATE POLICY "Admins can view all consent requests"
  ON parental_consent_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Database Function: Check Parent Email Limit (max 10 children per email)
CREATE OR REPLACE FUNCTION public.check_parent_email_limit(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM parental_consent_requests
  WHERE parent_email = lower(p_email) AND status = 'verified';
  
  RETURN consent_count < 10;
END;
$$;

-- Database Function: Check Email Change Eligibility (3 per 24h)
CREATE OR REPLACE FUNCTION public.can_change_parent_email(p_user_id UUID)
RETURNS TABLE(can_change BOOLEAN, changes_remaining INTEGER, next_change_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_request RECORD;
  changes_in_window INTEGER;
BEGIN
  SELECT * INTO latest_request
  FROM parental_consent_requests
  WHERE child_user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 3, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Count changes in last 24 hours from first_request_at
  IF latest_request.first_request_at > now() - interval '24 hours' THEN
    changes_in_window := latest_request.request_count;
    
    IF changes_in_window >= 3 THEN
      RETURN QUERY SELECT 
        false, 
        0, 
        latest_request.first_request_at + interval '24 hours';
      RETURN;
    ELSE
      RETURN QUERY SELECT 
        true, 
        3 - changes_in_window,
        NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
  ELSE
    -- 24h window has passed, reset counter
    RETURN QUERY SELECT true, 3, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
END;
$$;