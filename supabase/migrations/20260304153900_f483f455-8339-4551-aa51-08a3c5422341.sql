
-- 1. Migrate existing draw predictions to NULL predicted_school_id
UPDATE predictions SET predicted_school_id = NULL WHERE predicted_team = 'draw';

-- 2. Drop the foreign key on predicted_school_id so we can make it nullable
ALTER TABLE predictions ALTER COLUMN predicted_school_id DROP NOT NULL;

-- 3. Drop predicted_team column
ALTER TABLE predictions DROP COLUMN predicted_team;

-- 4. Update auto_score_fixture() to derive predicted team from predicted_school_id
CREATE OR REPLACE FUNCTION public.auto_score_fixture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip cancelled fixtures entirely
  IF NEW.status = 'cancelled' THEN
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
      pred_team TEXT;
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

        -- Derive predicted team from predicted_school_id
        IF prediction_record.predicted_school_id IS NULL THEN
          pred_team := 'draw';
        ELSIF prediction_record.predicted_school_id = NEW.school_a_id THEN
          pred_team := 'school_a';
        ELSE
          pred_team := 'school_b';
        END IF;

        IF pred_team = actual_winner THEN
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

-- 5. Update calculate_prediction_points() similarly
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
  pred_team TEXT;
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

    -- Derive predicted team from predicted_school_id
    IF prediction_record.predicted_school_id IS NULL THEN
      pred_team := 'draw';
    ELSIF prediction_record.predicted_school_id = fixture_record.school_a_id THEN
      pred_team := 'school_a';
    ELSE
      pred_team := 'school_b';
    END IF;
    
    IF pred_team = actual_winner THEN
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

-- 6. Update audit_prediction_update() to remove predicted_team references
CREATE OR REPLACE FUNCTION public.audit_prediction_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() != OLD.user_id AND has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action_type, details)
    VALUES (
      auth.uid(),
      OLD.user_id,
      'prediction_update',
      jsonb_build_object(
        'prediction_id', OLD.id,
        'fixture_id', OLD.fixture_id,
        'old_points_earned', OLD.points_earned,
        'new_points_earned', NEW.points_earned,
        'old_predicted_school_id', OLD.predicted_school_id,
        'new_predicted_school_id', NEW.predicted_school_id,
        'old_predicted_margin', OLD.predicted_margin,
        'new_predicted_margin', NEW.predicted_margin
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
