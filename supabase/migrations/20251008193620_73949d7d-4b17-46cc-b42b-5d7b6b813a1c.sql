-- Create enum for leaderboard types
CREATE TYPE public.leaderboard_type AS ENUM ('global', 'school', 'province', 'pool');

-- Create enum for badge types
CREATE TYPE public.badge_type AS ENUM (
  'top_dog',
  'podium_place',
  'climber',
  'consistent_contender',
  'school_hero',
  'perfect_weekend',
  'derby_winner',
  'streak_master'
);

-- Create user_scores table for tracking weekly and season scores
CREATE TABLE public.user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  weekly_points INTEGER DEFAULT 0,
  season_points INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  predictions_made INTEGER DEFAULT 0,
  predictions_correct INTEGER DEFAULT 0,
  rank_global INTEGER,
  rank_school INTEGER,
  rank_province INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, week_number, season_year)
);

-- Create pools table for custom group leaderboards
CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schools TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pool_members table
CREATE TABLE public.pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pool_id, user_id)
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  week_number INTEGER,
  season_year INTEGER NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_type, week_number, season_year)
);

-- Create school_scores table for school pride leaderboard
CREATE TABLE public.school_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  average_points DECIMAL(10,2) DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(school_name, week_number, season_year)
);

-- Enable RLS
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_scores
CREATE POLICY "User scores are viewable by everyone"
  ON public.user_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.user_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
  ON public.user_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for pools
CREATE POLICY "Pools are viewable by members"
  ON public.pools FOR SELECT
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM public.pool_members
      WHERE pool_id = pools.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create pools"
  ON public.pools FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Pool creators can update their pools"
  ON public.pools FOR UPDATE
  USING (auth.uid() = creator_id);

-- RLS Policies for pool_members
CREATE POLICY "Pool members are viewable by pool members"
  ON public.pool_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pools
      WHERE id = pool_id AND (creator_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.pool_members pm WHERE pm.pool_id = pool_id AND pm.user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can join pools"
  ON public.pool_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave pools"
  ON public.pool_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_badges
CREATE POLICY "User badges are viewable by everyone"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for school_scores
CREATE POLICY "School scores are viewable by everyone"
  ON public.school_scores FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_user_scores_user_id ON public.user_scores(user_id);
CREATE INDEX idx_user_scores_week_season ON public.user_scores(week_number, season_year);
CREATE INDEX idx_pool_members_pool_id ON public.pool_members(pool_id);
CREATE INDEX idx_pool_members_user_id ON public.pool_members(user_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_school_scores_week_season ON public.school_scores(week_number, season_year);

-- Create trigger for updated_at
CREATE TRIGGER update_user_scores_updated_at
  BEFORE UPDATE ON public.user_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_pools_updated_at
  BEFORE UPDATE ON public.pools
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_school_scores_updated_at
  BEFORE UPDATE ON public.school_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();