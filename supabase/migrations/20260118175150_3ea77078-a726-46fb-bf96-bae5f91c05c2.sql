-- Add unique constraint to user_scores for proper upsert
ALTER TABLE public.user_scores ADD CONSTRAINT user_scores_user_week_year_unique UNIQUE (user_id, week_number, season_year);

-- Create function to calculate prediction points for a fixture
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(p_fixture_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixture_record RECORD;
  prediction_record RECORD;
  actual_winner TEXT;
  actual_margin INTEGER;
  points INTEGER;
  total_processed INTEGER := 0;
BEGIN
  -- Get fixture with scores
  SELECT * INTO fixture_record FROM fixtures WHERE id = p_fixture_id;
  
  -- If no fixture or no scores, return 0
  IF fixture_record.id IS NULL OR fixture_record.home_score IS NULL OR fixture_record.away_score IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Determine winner and margin
  actual_margin := ABS(fixture_record.home_score - fixture_record.away_score);
  IF fixture_record.home_score > fixture_record.away_score THEN
    actual_winner := 'home';
  ELSIF fixture_record.away_score > fixture_record.home_score THEN
    actual_winner := 'away';
  ELSE
    actual_winner := 'draw';
  END IF;
  
  -- Process each prediction for this fixture
  FOR prediction_record IN 
    SELECT * FROM predictions WHERE fixture_id = p_fixture_id
  LOOP
    points := 0;
    
    -- Check if winner prediction is correct
    IF prediction_record.predicted_team = actual_winner THEN
      -- Correct winner: 10 points base
      points := 10;
      
      -- Exact margin bonus: +25
      IF prediction_record.predicted_margin = actual_margin THEN
        points := points + 25;
      -- Within 3 points: +15
      ELSIF ABS(prediction_record.predicted_margin - actual_margin) <= 3 THEN
        points := points + 15;
      -- Within 7 points: +10
      ELSIF ABS(prediction_record.predicted_margin - actual_margin) <= 7 THEN
        points := points + 10;
      END IF;
    END IF;
    
    -- Update the prediction with earned points
    UPDATE predictions SET points_earned = points, updated_at = now() WHERE id = prediction_record.id;
    total_processed := total_processed + 1;
  END LOOP;
  
  RETURN total_processed;
END;
$$;

-- Create function to rollup weekly scores for all users
CREATE OR REPLACE FUNCTION public.rollup_week_scores(p_week INTEGER, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
BEGIN
  -- For each user with predictions in fixtures from this week/year
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
    -- Upsert user_scores for this week
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
  
  -- Update season totals for all affected users
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

-- Create function to process all fixtures in a date range and calculate scores
CREATE OR REPLACE FUNCTION public.process_fixtures_in_range(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE(processed_fixtures INTEGER, processed_predictions INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixture_id UUID;
  total_fixtures INTEGER := 0;
  total_predictions INTEGER := 0;
  predictions_count INTEGER;
BEGIN
  -- Process each completed fixture in the range
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