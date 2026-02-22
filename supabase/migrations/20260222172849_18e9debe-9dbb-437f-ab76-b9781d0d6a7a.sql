
-- Step 1: Add venue_type column
ALTER TABLE public.fixtures
  ADD COLUMN venue_type text DEFAULT 'home';

-- Step 2: Add venue_id column (polymorphic, no FK)
ALTER TABLE public.fixtures
  ADD COLUMN venue_id uuid;

-- Step 3: Backfill existing data
UPDATE public.fixtures
  SET venue_type = 'home',
      venue_id = home_school_id;

-- Step 4: Rename venue to venue_legacy
ALTER TABLE public.fixtures
  RENAME COLUMN venue TO venue_legacy;
