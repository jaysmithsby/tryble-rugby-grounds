-- Add tournament_id column to fixtures table
ALTER TABLE public.fixtures
ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;