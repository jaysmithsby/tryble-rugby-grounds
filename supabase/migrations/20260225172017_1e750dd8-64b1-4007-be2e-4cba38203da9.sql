CREATE OR REPLACE FUNCTION public.delete_duplicate_fixtures()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  removed integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  WITH dupes AS (
    SELECT unnest(ids[2:]) AS dup_id
    FROM (
      SELECT array_agg(id ORDER BY
        CASE WHEN score_a IS NOT NULL AND score_b IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tournament_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC
      ) AS ids
      FROM fixtures
      GROUP BY LEAST(school_a_id, school_b_id), GREATEST(school_a_id, school_b_id), match_date::date
      HAVING COUNT(*) > 1
    ) grouped
  )
  DELETE FROM fixtures WHERE id IN (SELECT dup_id FROM dupes);

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;