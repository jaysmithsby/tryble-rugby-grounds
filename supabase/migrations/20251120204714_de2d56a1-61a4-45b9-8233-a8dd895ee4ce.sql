-- Add new fields to profiles table for user management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS age_band text CHECK (age_band IN ('U13', '13-15', '16-17', '18+')),
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'adult' CHECK (account_type IN ('minor', 'adult')),
ADD COLUMN IF NOT EXISTS consent_status text DEFAULT 'pending' CHECK (consent_status IN ('verified', 'pending')),
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS province text;

-- Create user_sanctions table for bans and suspensions
CREATE TABLE IF NOT EXISTS public.user_sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sanction_type text NOT NULL CHECK (sanction_type IN ('suspension', 'ban')),
  duration_days integer,
  reason text NOT NULL,
  sanctioned_by uuid REFERENCES auth.users(id) NOT NULL,
  sanctioned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sanctions"
ON public.user_sanctions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create sanctions"
ON public.user_sanctions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sanctions"
ON public.user_sanctions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create user_reports table for moderation
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_reason text NOT NULL,
  report_details text,
  status text DEFAULT 'under_review' CHECK (status IN ('under_review', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reports"
ON public.user_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create reports"
ON public.user_reports FOR INSERT
WITH CHECK (auth.uid() = reported_by_user_id);

CREATE POLICY "Admins can update reports"
ON public.user_reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin_audit_log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create audit logs"
ON public.admin_audit_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_sanctions_user_id ON public.user_sanctions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sanctions_active ON public.user_sanctions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_user_id);

-- Update RLS policy for profiles to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));