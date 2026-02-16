
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
      -- Correct winner: 4 brags base
      points := 4;
      
      -- Within 7 margin: +1 brag (5 total)
      IF ABS(prediction_record.predicted_margin - actual_margin) <= 7 THEN
        points := 5;
        -- Exact margin bonus: +1 brag (6 total)
        IF prediction_record.predicted_margin = actual_margin THEN
          points := 6;
        END IF;
      END IF;
    ELSE
      -- Wrong winner
      IF ABS(prediction_record.predicted_margin - actual_margin) <= 7 THEN
        -- Wrong winner but margin within 7: 1 bonus brag
        points := 1;
      ELSE
        points := 0;
      END IF;
    END IF;
    
    -- Update the prediction with earned points
    UPDATE predictions SET points_earned = points, updated_at = now() WHERE id = prediction_record.id;
    total_processed := total_processed + 1;
  END LOOP;
  
  RETURN total_processed;
END;
$function$;
