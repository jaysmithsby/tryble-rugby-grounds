CREATE OR REPLACE FUNCTION public.get_match_history_batch(p_fixture_ids uuid[])
RETURNS TABLE(fixture_id uuid, has_history boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    f.id AS fixture_id,
    EXISTS (
      SELECT 1 FROM fixtures h
      WHERE h.status = 'completed'
        AND h.id != f.id
        AND LEAST(h.school_a_id, h.school_b_id) = LEAST(f.school_a_id, f.school_b_id)
        AND GREATEST(h.school_a_id, h.school_b_id) = GREATEST(f.school_a_id, f.school_b_id)
    ) AS has_history
  FROM unnest(p_fixture_ids) AS input_id
  JOIN fixtures f ON f.id = input_id;
$$;