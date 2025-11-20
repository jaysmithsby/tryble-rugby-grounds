-- Add slug column to schools table for SEO-friendly URLs
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(school_name TEXT, school_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base slug from name
  base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(school_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  final_slug := base_slug;
  
  -- Check if slug exists for a different school
  WHILE EXISTS (
    SELECT 1 FROM public.schools 
    WHERE slug = final_slug 
    AND id != school_id
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for all schools
UPDATE public.schools
SET slug = generate_unique_slug(name, id)
WHERE slug IS NULL OR slug = '';

-- Add unique constraint and NOT NULL
ALTER TABLE public.schools
ADD CONSTRAINT schools_slug_key UNIQUE (slug);

ALTER TABLE public.schools
ALTER COLUMN slug SET NOT NULL;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_schools_slug ON public.schools(slug);

-- Drop the helper function
DROP FUNCTION generate_unique_slug(TEXT, UUID);