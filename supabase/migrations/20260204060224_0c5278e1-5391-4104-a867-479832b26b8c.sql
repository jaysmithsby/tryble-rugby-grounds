-- Phase 1: Database Changes for New Onboarding Flow

-- 1.1 Create Tournament Following Table
CREATE TABLE public.user_tournament_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);

-- Enable RLS
ALTER TABLE public.user_tournament_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament follows
CREATE POLICY "Users can view own follows"
  ON public.user_tournament_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow tournaments"
  ON public.user_tournament_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow tournaments"
  ON public.user_tournament_follows FOR DELETE
  USING (auth.uid() = user_id);

-- 1.2 Add Year of Birth to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_birth INTEGER;

-- 1.3 Add Onboarding Status Tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;