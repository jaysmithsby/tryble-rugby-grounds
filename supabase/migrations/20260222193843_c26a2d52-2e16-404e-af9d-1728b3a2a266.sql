
-- Add predicted_school_id column
ALTER TABLE public.predictions
ADD COLUMN predicted_school_id uuid REFERENCES public.schools(id);

-- Backfill existing records
UPDATE predictions p
SET predicted_school_id = CASE 
  WHEN p.predicted_team = 'home' THEN f.home_school_id
  WHEN p.predicted_team = 'away' THEN f.away_school_id
END
FROM fixtures f WHERE f.id = p.fixture_id;

-- Set NOT NULL after backfill
ALTER TABLE public.predictions
ALTER COLUMN predicted_school_id SET NOT NULL;
