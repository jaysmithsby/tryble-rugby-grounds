-- Drop the old check constraint that only allows 'verified' and 'pending'
ALTER TABLE public.schools DROP CONSTRAINT schools_status_check;

-- Add new check constraint with all valid status values
ALTER TABLE public.schools ADD CONSTRAINT schools_status_check 
  CHECK (status = ANY (ARRAY['draft', 'pending', 'pending_review', 'approved', 'rejected', 'archived', 'verified']));

-- Add columns needed for the request workflow
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_type text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS note_to_admin text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS request_logo_url text;

-- Update default status from 'verified' to 'approved'
ALTER TABLE public.schools ALTER COLUMN status SET DEFAULT 'approved';

-- Migrate existing 'verified' rows to 'approved'
UPDATE public.schools SET status = 'approved' WHERE status = 'verified';

-- RLS policy: allow authenticated users to insert schools with status = 'draft'
CREATE POLICY "Users can request schools with draft status"
ON public.schools
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND status = 'draft' 
  AND is_visible = false
);
