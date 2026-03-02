CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(
  p_season_year integer,
  p_school_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid, total_brags bigint, picks_made bigint,
  picks_correct bigint, avg_efficiency numeric,
  display_name text, school_name text, school_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(SUM(p.points_earned), 0) as total_brags,
    COUNT(*) as picks_made,
    COUNT(*) FILTER (WHERE p.points_earned >= 4) as picks_correct,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(COALESCE(SUM(p.points_earned), 0)::numeric / COUNT(*), 2)
      ELSE 0
    END as avg_efficiency,
    pp.display_name,
    pp.school_name,
    pr.school_id
  FROM predictions p
  JOIN fixtures f ON p.fixture_id = f.id
  LEFT JOIN profiles_public pp ON pp.id = p.user_id
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE f.year = p_season_year
    AND p.points_earned IS NOT NULL
    AND (p_school_id IS NULL OR pr.school_id = p_school_id)
  GROUP BY p.user_id, pp.display_name, pp.school_name, pr.school_id
  ORDER BY total_brags DESC, avg_efficiency DESC, picks_correct DESC
  LIMIT p_limit;
$$;