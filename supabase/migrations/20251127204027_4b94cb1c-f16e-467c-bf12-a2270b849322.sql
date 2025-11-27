-- Add new columns to schools table for enhanced school management
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS emblem_url text,
ADD COLUMN IF NOT EXISTS jersey_url text,
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.schools.nickname IS 'School nickname/alias e.g. The Maroon Machine';
COMMENT ON COLUMN public.schools.emblem_url IS 'URL to school emblem/crest image - primary display image';
COMMENT ON COLUMN public.schools.jersey_url IS 'URL to school jersey image - fallback if no emblem';
COMMENT ON COLUMN public.schools.is_visible IS 'Whether school is visible in public listings';