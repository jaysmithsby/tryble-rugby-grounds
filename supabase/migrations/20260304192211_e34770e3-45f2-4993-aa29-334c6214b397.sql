CREATE OR REPLACE FUNCTION public.get_community_avg_for_fixtures(p_fixture_ids uuid[])
RETURNS TABLE(fixture_id uuid, avg_points numeric, total_predictions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT p.fixture_id, ROUND(AVG(p.points_earned)::numeric, 1), COUNT(*)
  FROM predictions p
  WHERE p.fixture_id = ANY(p_fixture_ids)
    AND p.points_earned IS NOT NULL
  GROUP BY p.fixture_id;
$$;