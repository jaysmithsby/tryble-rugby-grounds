
CREATE OR REPLACE FUNCTION public.auto_score_fixture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip cancelled fixtures entirely
  IF NEW.status = 'cancelled' THEN
    -- Zero out any existing prediction points for this fixture
    UPDATE predictions SET points_earned = 0, updated_at = now() WHERE fixture_id = NEW.id;
    RETURN NEW;
  END IF;

  IF (NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL)
     AND (OLD.score_a IS NULL OR OLD.score_b IS NULL
          OR NEW.score_a != OLD.score_a OR NEW.score_b != OLD.score_b)
  THEN
    DECLARE
      actual_winner TEXT;
      actual_margin INTEGER;
      points INTEGER;
      prediction_record RECORD;
    BEGIN
      actual_margin := ABS(NEW.score_a - NEW.score_b);
      IF NEW.score_a > NEW.score_b THEN
        actual_winner := 'school_a';
      ELSIF NEW.score_b > NEW.score_a THEN
        actual_winner := 'school_b';
      ELSE
        actual_winner := 'draw';
      END IF;

      FOR prediction_record IN
        SELECT * FROM predictions WHERE fixture_id = NEW.id
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
      END LOOP;
    END;
  END IF;
  RETURN NEW;
END;
$function$;
