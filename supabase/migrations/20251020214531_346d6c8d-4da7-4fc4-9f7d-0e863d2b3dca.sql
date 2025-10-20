-- Add voting_closes_at and is_voting_finalized to pools table
ALTER TABLE public.pools
ADD COLUMN IF NOT EXISTS voting_closes_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_voting_finalized boolean DEFAULT false;

-- Function to calculate next Friday at 8pm
CREATE OR REPLACE FUNCTION public.get_next_friday_8pm(from_time timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE plpgsql
AS $$
DECLARE
  days_until_friday integer;
  next_friday_date date;
  result_timestamp timestamp with time zone;
BEGIN
  -- Get the day of week (0 = Sunday, 5 = Friday)
  days_until_friday := (5 - EXTRACT(DOW FROM from_time)::integer + 7) % 7;
  
  -- If it's Friday and before 8pm, use today, otherwise next Friday
  IF days_until_friday = 0 AND EXTRACT(HOUR FROM from_time) < 20 THEN
    next_friday_date := from_time::date;
  ELSE
    IF days_until_friday = 0 THEN
      days_until_friday := 7;
    END IF;
    next_friday_date := (from_time::date + days_until_friday);
  END IF;
  
  -- Set time to 8pm in the timezone
  result_timestamp := (next_friday_date || ' 20:00:00')::timestamp with time zone;
  
  RETURN result_timestamp;
END;
$$;

-- Function to finalize pool voting
CREATE OR REPLACE FUNCTION public.finalize_pool_voting(pool_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_counts record;
  final_schools text[];
  school_count integer := 0;
BEGIN
  -- Get top 10 schools by vote count, alphabetically ordered for ties
  final_schools := ARRAY(
    SELECT school_name
    FROM (
      SELECT 
        school_name,
        COUNT(*) as vote_count
      FROM pool_school_votes
      WHERE pool_id = pool_id_param
      GROUP BY school_name
      ORDER BY vote_count DESC, school_name ASC
      LIMIT 10
    ) as sorted_schools
  );
  
  -- Update the pool with finalized schools
  UPDATE pools
  SET 
    schools = final_schools,
    is_voting_finalized = true
  WHERE id = pool_id_param;
END;
$$;

-- Function to check if all pool members have voted
CREATE OR REPLACE FUNCTION public.check_all_members_voted(pool_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer;
  voters_count integer;
BEGIN
  -- Count total members
  SELECT COUNT(DISTINCT user_id) INTO member_count
  FROM pool_members
  WHERE pool_id = pool_id_param;
  
  -- Count members who have voted
  SELECT COUNT(DISTINCT user_id) INTO voters_count
  FROM pool_school_votes
  WHERE pool_id = pool_id_param;
  
  RETURN member_count > 0 AND member_count = voters_count;
END;
$$;