
-- 1. Auto-scoring trigger: fires when fixture scores are updated
CREATE OR REPLACE FUNCTION public.auto_score_fixture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL)
     AND (OLD.score_a IS NULL OR OLD.score_b IS NULL
          OR NEW.score_a != OLD.score_a OR NEW.score_b != OLD.score_b)
  THEN
    -- Inline brags calculation (same logic as calculate_prediction_points but without admin check)
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
$$;

CREATE TRIGGER trg_auto_score_fixture
AFTER UPDATE ON public.fixtures
FOR EACH ROW
EXECUTE FUNCTION public.auto_score_fixture();

-- 2. get_leaderboard_stats RPC
CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(
  p_season_year integer,
  p_school_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  total_brags bigint,
  picks_made bigint,
  picks_correct bigint,
  avg_efficiency numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(SUM(p.points_earned), 0) as total_brags,
    COUNT(*) as picks_made,
    COUNT(*) FILTER (WHERE p.points_earned >= 4) as picks_correct,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COALESCE(SUM(p.points_earned), 0)::numeric / COUNT(*), 2)
      ELSE 0
    END as avg_efficiency
  FROM predictions p
  JOIN fixtures f ON p.fixture_id = f.id
  WHERE f.year = p_season_year
    AND p.points_earned IS NOT NULL
    AND (p_school_id IS NULL OR p.user_id IN (
      SELECT id FROM profiles WHERE school_id = p_school_id
    ))
  GROUP BY p.user_id
  ORDER BY total_brags DESC, avg_efficiency DESC, picks_correct DESC
$$;

-- 3. get_user_season_stats RPC
CREATE OR REPLACE FUNCTION public.get_user_season_stats(
  p_user_id uuid,
  p_season_year integer
)
RETURNS TABLE(
  total_brags bigint,
  picks_made bigint,
  picks_correct bigint,
  accuracy_pct numeric,
  current_streak integer,
  global_rank bigint,
  school_rank bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_id uuid;
  v_total_brags bigint;
  v_picks_made bigint;
  v_picks_correct bigint;
  v_global_rank bigint;
  v_school_rank bigint;
  v_streak integer := 0;
  pred_record RECORD;
BEGIN
  -- Get user stats
  SELECT
    COALESCE(SUM(pr.points_earned), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE pr.points_earned >= 4)
  INTO v_total_brags, v_picks_made, v_picks_correct
  FROM predictions pr
  JOIN fixtures fx ON pr.fixture_id = fx.id
  WHERE pr.user_id = p_user_id AND fx.year = p_season_year AND pr.points_earned IS NOT NULL;

  -- Global rank
  SELECT COUNT(*) + 1 INTO v_global_rank
  FROM (
    SELECT pr2.user_id, SUM(pr2.points_earned) as tb
    FROM predictions pr2
    JOIN fixtures fx2 ON pr2.fixture_id = fx2.id
    WHERE fx2.year = p_season_year AND pr2.points_earned IS NOT NULL
    GROUP BY pr2.user_id
    HAVING SUM(pr2.points_earned) > v_total_brags
  ) ranked;

  -- School rank
  SELECT school_id INTO v_school_id FROM profiles WHERE id = p_user_id;
  IF v_school_id IS NOT NULL THEN
    SELECT COUNT(*) + 1 INTO v_school_rank
    FROM (
      SELECT pr3.user_id, SUM(pr3.points_earned) as tb
      FROM predictions pr3
      JOIN fixtures fx3 ON pr3.fixture_id = fx3.id
      WHERE fx3.year = p_season_year AND pr3.points_earned IS NOT NULL
        AND pr3.user_id IN (SELECT id FROM profiles WHERE school_id = v_school_id)
      GROUP BY pr3.user_id
      HAVING SUM(pr3.points_earned) > v_total_brags
    ) ranked;
  END IF;

  -- Current streak
  FOR pred_record IN
    SELECT pr4.points_earned
    FROM predictions pr4
    JOIN fixtures fx4 ON pr4.fixture_id = fx4.id
    WHERE pr4.user_id = p_user_id AND pr4.points_earned IS NOT NULL
    ORDER BY fx4.match_date DESC, pr4.created_at DESC
    LIMIT 50
  LOOP
    IF pred_record.points_earned > 0 THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_total_brags,
    v_picks_made,
    v_picks_correct,
    CASE WHEN v_picks_made > 0
      THEN ROUND((v_picks_correct::numeric / v_picks_made) * 100, 1)
      ELSE 0
    END,
    v_streak,
    v_global_rank,
    COALESCE(v_school_rank, 0);
END;
$$;

-- 4. Drop obsolete RPCs
DROP FUNCTION IF EXISTS public.rollup_week_scores(integer, integer);
DROP FUNCTION IF EXISTS public.process_fixtures_in_range(timestamp with time zone, timestamp with time zone);

-- 5. Drop obsolete tables
DROP TABLE IF EXISTS public.user_scores;
DROP TABLE IF EXISTS public.school_scores;
