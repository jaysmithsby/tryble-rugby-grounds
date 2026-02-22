-- Update venue_type values: home/away -> school
UPDATE public.fixtures
SET venue_type = 'school'
WHERE venue_type IN ('home', 'away');

-- Update default
ALTER TABLE public.fixtures
ALTER COLUMN venue_type SET DEFAULT 'school';