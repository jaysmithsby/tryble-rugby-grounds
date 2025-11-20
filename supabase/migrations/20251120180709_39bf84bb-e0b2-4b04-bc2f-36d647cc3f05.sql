-- Add new columns to schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS main_rival TEXT,
ADD COLUMN IF NOT EXISTS established_year INTEGER,
ADD COLUMN IF NOT EXISTS springboks_count INTEGER,
ADD COLUMN IF NOT EXISTS trivia_fact TEXT;

-- Update RLS policies to allow admins to update schools
CREATE POLICY "Admins can update schools"
ON public.schools
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert schools
DROP POLICY IF EXISTS "Users can add pending schools" ON public.schools;

CREATE POLICY "Admins can insert schools"
ON public.schools
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete schools
CREATE POLICY "Admins can delete schools"
ON public.schools
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));