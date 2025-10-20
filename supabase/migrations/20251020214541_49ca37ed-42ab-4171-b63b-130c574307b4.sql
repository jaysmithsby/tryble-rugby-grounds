-- Fix search_path for the get_next_friday_8pm function
CREATE OR REPLACE FUNCTION public.get_next_friday_8pm(from_time timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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