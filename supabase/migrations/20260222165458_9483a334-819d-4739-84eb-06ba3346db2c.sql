
-- Create an immutable wrapper for date extraction
CREATE OR REPLACE FUNCTION public.fixture_match_day(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT ts::date $$;

-- Create non-unique index for mirror-pair auditing (soft check)
-- Uses LEAST/GREATEST to normalize school order + date
CREATE INDEX IF NOT EXISTS idx_fixtures_mirror_pair_date
ON public.fixtures (
  LEAST(home_school_id, away_school_id),
  GREATEST(home_school_id, away_school_id),
  public.fixture_match_day(match_date)
);
