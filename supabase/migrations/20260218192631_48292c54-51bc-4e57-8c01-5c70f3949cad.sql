
-- Fix 1: Add admin authorization checks to sensitive RPC functions

-- calculate_prediction_points - admin only
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_fixture_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fixture_record RECORD;
  prediction_record RECORD;
  actual_winner TEXT;
  actual_margin INTEGER;
  points INTEGER;
  total_processed INTEGER := 0;
BEGIN
  -- Require admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  SELECT * INTO fixture_record FROM fixtures WHERE id = p_fixture_id;
  
  IF fixture_record.id IS NULL OR fixture_record.home_score IS NULL OR fixture_record.away_score IS NULL THEN
    RETURN 0;
  END IF;
  
  actual_margin := ABS(fixture_record.home_score - fixture_record.away_score);
  IF fixture_record.home_score > fixture_record.away_score THEN
    actual_winner := 'home';
  ELSIF fixture_record.away_score > fixture_record.home_score THEN
    actual_winner := 'away';
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
$$;

-- rollup_week_scores - admin only
CREATE OR REPLACE FUNCTION public.rollup_week_scores(p_week integer, p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
BEGIN
  -- Require admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  FOR user_record IN
    SELECT 
      p.user_id,
      COALESCE(SUM(p.points_earned), 0) as weekly_points,
      COUNT(*) as predictions_made,
      COUNT(CASE WHEN p.points_earned > 0 THEN 1 END) as correct_predictions
    FROM predictions p
    JOIN fixtures f ON p.fixture_id = f.id
    WHERE f.year = p_year
      AND EXTRACT(WEEK FROM f.match_date) = p_week
    GROUP BY p.user_id
  LOOP
    INSERT INTO user_scores (user_id, week_number, season_year, weekly_points, predictions_made, predictions_correct)
    VALUES (user_record.user_id, p_week, p_year, user_record.weekly_points, user_record.predictions_made, user_record.correct_predictions)
    ON CONFLICT (user_id, week_number, season_year) 
    DO UPDATE SET 
      weekly_points = EXCLUDED.weekly_points,
      predictions_made = EXCLUDED.predictions_made,
      predictions_correct = EXCLUDED.predictions_correct,
      updated_at = now();
    
    total_users := total_users + 1;
  END LOOP;
  
  UPDATE user_scores us
  SET season_points = (
    SELECT COALESCE(SUM(weekly_points), 0) 
    FROM user_scores 
    WHERE user_id = us.user_id AND season_year = p_year
  )
  WHERE season_year = p_year;
  
  RETURN total_users;
END;
$$;

-- process_fixtures_in_range - admin only
CREATE OR REPLACE FUNCTION public.process_fixtures_in_range(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
RETURNS TABLE(processed_fixtures integer, processed_predictions integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fixture_id UUID;
  total_fixtures INTEGER := 0;
  total_predictions INTEGER := 0;
  predictions_count INTEGER;
BEGIN
  -- Require admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  FOR fixture_id IN 
    SELECT id FROM fixtures 
    WHERE match_date >= p_start_date 
      AND match_date <= p_end_date
      AND home_score IS NOT NULL 
      AND away_score IS NOT NULL
  LOOP
    SELECT calculate_prediction_points(fixture_id) INTO predictions_count;
    total_fixtures := total_fixtures + 1;
    total_predictions := total_predictions + predictions_count;
  END LOOP;
  
  processed_fixtures := total_fixtures;
  processed_predictions := total_predictions;
  RETURN NEXT;
END;
$$;

-- increment_ad_impression - add rate limiting via requiring authenticated
CREATE OR REPLACE FUNCTION public.increment_ad_impression(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE advertisements SET impressions = impressions + 1 WHERE id = ad_id;
END;
$$;

-- increment_ad_click - add rate limiting via requiring authenticated
CREATE OR REPLACE FUNCTION public.increment_ad_click(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE advertisements SET clicks = clicks + 1 WHERE id = ad_id;
END;
$$;

-- Fix 2: Restrict school-jerseys bucket uploads to admin only
DROP POLICY IF EXISTS "Authenticated users can upload school jerseys" ON storage.objects;
CREATE POLICY "Admins can upload school jerseys"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-jerseys' AND has_role(auth.uid(), 'admin'::app_role));
