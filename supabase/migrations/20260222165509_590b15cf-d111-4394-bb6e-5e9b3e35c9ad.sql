
-- Fix search_path on the new function
CREATE OR REPLACE FUNCTION public.fixture_match_day(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$ SELECT ts::date $$;
