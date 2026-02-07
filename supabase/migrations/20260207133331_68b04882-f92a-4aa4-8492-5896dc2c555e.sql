-- Create table to store email verification tokens
CREATE TABLE public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMPTZ
);

-- Index for quick token lookup
CREATE INDEX idx_verification_tokens_token ON public.email_verification_tokens(token);

-- Index for user lookup (to find pending verifications)
CREATE INDEX idx_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- RLS: Only service role can access (edge functions will use service key)
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed since only service role should access this table

COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for custom verification flow via Resend';