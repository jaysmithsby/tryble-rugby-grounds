-- Add jersey_config column to schools table to store custom jersey design configurations
ALTER TABLE public.schools 
ADD COLUMN jersey_config JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN public.schools.jersey_config IS 'JSON configuration for custom jersey design: {layout, baseColor, stripes[], collarColor, sleeveTrimColor}';