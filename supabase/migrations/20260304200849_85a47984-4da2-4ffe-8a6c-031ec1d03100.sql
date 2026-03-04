
CREATE OR REPLACE FUNCTION public.get_user_season_stats(p_user_id uuid, p_season_year integer)
 RETURNS TABLE(total_brags bigint, picks_made bigint, picks_correct bigint, accuracy_pct numeric, current_streak integer, global_rank bigint, school_rank bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_id uuid;
  v_total_brags bigint;
  v_picks_made bigint;
  v_picks_correct bigint;
  v_global_rank bigint;
  v_school_rank bigint;
  v_streak integer := 0;
  week_rec RECORD;
  v_eligible integer;
  v_predicted integer;
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

  -- Weekly participation streak
  -- For each week (ending Sunday 23:59), check if user predicted ALL fixtures
  -- involving schools they follow. Count consecutive complete weeks backwards.
  FOR week_rec IN
    SELECT DISTINCT date_trunc('week', fx.match_date) AS week_start
    FROM fixtures fx
    WHERE fx.year = p_season_year
      AND fx.status != 'cancelled'
      AND date_trunc('week', fx.match_date) <= date_trunc('week', now())
      AND (
        fx.school_a_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
        OR fx.school_b_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
      )
    ORDER BY week_start DESC
  LOOP
    -- Count eligible fixtures for this week
    SELECT COUNT(*) INTO v_eligible
    FROM fixtures fx
    WHERE fx.year = p_season_year
      AND fx.status != 'cancelled'
      AND date_trunc('week', fx.match_date) = week_rec.week_start
      AND (
        fx.school_a_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
        OR fx.school_b_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
      );

    -- Count user predictions for those fixtures
    SELECT COUNT(*) INTO v_predicted
    FROM predictions pr
    WHERE pr.user_id = p_user_id
      AND pr.fixture_id IN (
        SELECT fx.id
        FROM fixtures fx
        WHERE fx.year = p_season_year
          AND fx.status != 'cancelled'
          AND date_trunc('week', fx.match_date) = week_rec.week_start
          AND (
            fx.school_a_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
            OR fx.school_b_id IN (SELECT school_id FROM user_school_follows WHERE user_id = p_user_id)
          )
      );

    IF v_eligible > 0 AND v_predicted >= v_eligible THEN
      v_streak := v_streak + 1;
    ELSIF v_eligible > 0 THEN
      EXIT; -- Break streak
    END IF;
    -- weeks with 0 eligible are skipped (already filtered out by the query)
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
$function$;
