
-- Step 1: Create tournament_editions table
CREATE TABLE public.tournament_editions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  year integer NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  participating_schools text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, year)
);

ALTER TABLE public.tournament_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament editions are viewable by everyone"
  ON public.tournament_editions FOR SELECT USING (true);
CREATE POLICY "Admins can insert tournament editions"
  ON public.tournament_editions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update tournament editions"
  ON public.tournament_editions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tournament editions"
  ON public.tournament_editions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER handle_tournament_editions_updated_at
  BEFORE UPDATE ON public.tournament_editions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 2: Migrate existing tournament data into editions
INSERT INTO public.tournament_editions (tournament_id, year, start_date, end_date, participating_schools, is_active)
SELECT id, EXTRACT(YEAR FROM start_date)::integer, start_date, end_date,
  COALESCE(participating_schools, '{}'::text[]), COALESCE(is_active, true)
FROM public.tournaments;

-- Step 3: Drop old FK first (before any updates)
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_tournament_id_fkey;

-- Step 4: Null out orphaned tournament references (tournaments that don't exist)
UPDATE public.fixtures
SET tournament_id = NULL, venue_type = 'school'
WHERE tournament_id IS NOT NULL
  AND tournament_id NOT IN (SELECT id FROM public.tournaments);

-- Step 5: Remap valid fixtures to edition IDs
UPDATE public.fixtures f
SET tournament_id = te.id
FROM public.tournament_editions te
WHERE f.tournament_id = te.tournament_id;

-- Step 6: Add new FK pointing to tournament_editions
ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES public.tournament_editions(id);

-- Step 7: Drop moved columns from tournaments
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS participating_schools,
  DROP COLUMN IF EXISTS is_active;
