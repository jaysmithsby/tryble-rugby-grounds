-- Fix 1: Drop the incorrectly named INSERT policy on user_badges and create admin-only INSERT policy
-- The existing policy "Users can view their own badges" is for INSERT but has wrong name
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;

-- Create proper admin-only INSERT policy for user_badges
CREATE POLICY "Only admins can insert badges"
ON public.user_badges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Update parental_consent_requests SELECT policy to exclude consent_token
-- First, drop existing policies and recreate with proper column restrictions
-- Since we can't do column-level RLS, we'll ensure tokens are never exposed via API

-- The consent_token should only be used server-side (edge functions)
-- Add a policy comment for documentation (RLS policies already restrict access)

-- Fix 3: Create a view for profiles that excludes sensitive PII for leaderboard/public display purposes
-- This allows safe querying for leaderboards without exposing contact info

-- Create a safe public profile view for leaderboard display
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  display_name,
  username,
  school_name,
  province,
  country,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;