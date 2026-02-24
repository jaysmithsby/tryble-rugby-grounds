
-- Step 1: Add new columns to tournament_editions
ALTER TABLE public.tournament_editions
  ADD COLUMN IF NOT EXISTS host_school text,
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS format_notes text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text;

-- Step 2: Copy data from tournaments to their editions
UPDATE public.tournament_editions te
SET
  host_school = t.host_school,
  venue = t.venue,
  province = t.province,
  format_notes = t.format_notes,
  logo_url = t.logo_url,
  sponsor_name = t.sponsor_name,
  sponsor_logo_url = t.sponsor_logo_url
FROM public.tournaments t
WHERE te.tournament_id = t.id;

-- Step 3: Drop the columns from tournaments
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS host_school,
  DROP COLUMN IF EXISTS venue,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS format_notes,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS sponsor_name,
  DROP COLUMN IF EXISTS sponsor_logo_url;
