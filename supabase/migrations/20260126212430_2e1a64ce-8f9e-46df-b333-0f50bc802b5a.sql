-- Add missing foreign key constraints for fixtures table to schools table
-- These are needed for Supabase client to resolve the school joins properly

ALTER TABLE public.fixtures
ADD CONSTRAINT fixtures_home_school_id_fkey
FOREIGN KEY (home_school_id) REFERENCES public.schools(id);

ALTER TABLE public.fixtures
ADD CONSTRAINT fixtures_away_school_id_fkey
FOREIGN KEY (away_school_id) REFERENCES public.schools(id);