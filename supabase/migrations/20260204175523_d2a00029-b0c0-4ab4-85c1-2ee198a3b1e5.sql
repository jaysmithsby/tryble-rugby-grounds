-- Add is_archived column to schools table for soft delete
ALTER TABLE public.schools 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add archived_at timestamp to track when it was archived
ALTER TABLE public.schools 
ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;

-- Create index for faster filtering of non-archived schools
CREATE INDEX idx_schools_not_archived ON public.schools (is_archived) WHERE is_archived = false;