
-- Step 0: Drop the check constraint on predicted_team
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_predicted_team_check;

-- Step 1: Rename columns on fixtures
ALTER TABLE public.fixtures RENAME COLUMN home_school_id TO school_a_id;
ALTER TABLE public.fixtures RENAME COLUMN away_school_id TO school_b_id;
ALTER TABLE public.fixtures RENAME COLUMN home_score TO score_a;
ALTER TABLE public.fixtures RENAME COLUMN away_score TO score_b;

-- Step 2: Drop old foreign key constraints and create new ones
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_home_school_id_fkey;
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_away_school_id_fkey;

ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_school_a_id_fkey FOREIGN KEY (school_a_id) REFERENCES public.schools(id);
ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_school_b_id_fkey FOREIGN KEY (school_b_id) REFERENCES public.schools(id);

-- Step 3: Recreate the mirror-pair index with new column names
DROP INDEX IF EXISTS idx_fixtures_mirror_pair_date;
CREATE INDEX idx_fixtures_mirror_pair_date ON public.fixtures (
  LEAST(school_a_id, school_b_id),
  GREATEST(school_a_id, school_b_id),
  fixture_match_day(match_date)
);

-- Step 4: Update predictions data
UPDATE public.predictions SET predicted_team = 'school_a' WHERE predicted_team = 'home';
UPDATE public.predictions SET predicted_team = 'school_b' WHERE predicted_team = 'away';

-- Step 5: Add new check constraint for predicted_team
ALTER TABLE public.predictions ADD CONSTRAINT predictions_predicted_team_check 
  CHECK (predicted_team IN ('school_a', 'school_b', 'draw'));

-- Step 6: Update calculate_prediction_points function
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_fixture_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fixture_record RECORD;
  prediction_record RECORD;
  actual_winner TEXT;
  actual_margin INTEGER;
  points INTEGER;
  total_processed INTEGER := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  SELECT * INTO fixture_record FROM fixtures WHERE id = p_fixture_id;
  
  IF fixture_record.id IS NULL OR fixture_record.score_a IS NULL OR fixture_record.score_b IS NULL THEN
    RETURN 0;
  END IF;
  
  actual_margin := ABS(fixture_record.score_a - fixture_record.score_b);
  IF fixture_record.score_a > fixture_record.score_b THEN
    actual_winner := 'school_a';
  ELSIF fixture_record.score_b > fixture_record.score_a THEN
    actual_winner := 'school_b';
  ELSE
    actual_winner := 'draw';
  END IF;
  
  FOR prediction_record IN 
    SELECT * FROM predictions WHERE fixture_id = p_fixture_id
  LOOP
    points := 0;
    
    IF prediction_record.predicted_team = actual_winner THEN
      points := 4;
      IF ABS(prediction_record.predicted_margin - actual_margin) <= 7 THEN
        points := 5;
        IF prediction_record.predicted_margin = actual_margin THEN
          points := 6;
        END IF;
      END IF;
    ELSE
      IF ABS(prediction_record.predicted_margin - actual_margin) <= 7 THEN
        points := 1;
      ELSE
        points := 0;
      END IF;
    END IF;
    
    UPDATE predictions SET points_earned = points, updated_at = now() WHERE id = prediction_record.id;
    total_processed := total_processed + 1;
  END LOOP;
  
  RETURN total_processed;
END;
$function$;

-- Step 7: Update process_fixtures_in_range function
CREATE OR REPLACE FUNCTION public.process_fixtures_in_range(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(processed_fixtures integer, processed_predictions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fixture_id UUID;
  total_fixtures INTEGER := 0;
  total_predictions INTEGER := 0;
  predictions_count INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  FOR fixture_id IN 
    SELECT id FROM fixtures 
    WHERE match_date >= p_start_date 
      AND match_date <= p_end_date
      AND score_a IS NOT NULL 
      AND score_b IS NOT NULL
  LOOP
    SELECT calculate_prediction_points(fixture_id) INTO predictions_count;
    total_fixtures := total_fixtures + 1;
    total_predictions := total_predictions + predictions_count;
  END LOOP;
  
  processed_fixtures := total_fixtures;
  processed_predictions := total_predictions;
  RETURN NEXT;
END;
$function$;
