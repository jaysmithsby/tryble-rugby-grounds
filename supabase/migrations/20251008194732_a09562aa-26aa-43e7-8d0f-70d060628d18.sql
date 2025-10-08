-- Add voting mode to pools table
ALTER TABLE public.pools 
ADD COLUMN IF NOT EXISTS voting_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_schools integer DEFAULT 10;

-- Create pool_school_votes table for voting on schools
CREATE TABLE IF NOT EXISTS public.pool_school_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(pool_id, user_id, school_name)
);

-- Enable RLS on pool_school_votes
ALTER TABLE public.pool_school_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for pool_school_votes
CREATE POLICY "Pool members can view votes in their pools"
ON public.pool_school_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pool_members
    WHERE pool_members.pool_id = pool_school_votes.pool_id
    AND pool_members.user_id = auth.uid()
  )
);

CREATE POLICY "Pool members can vote for schools"
ON public.pool_school_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.pool_members
    WHERE pool_members.pool_id = pool_school_votes.pool_id
    AND pool_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own votes"
ON public.pool_school_votes FOR DELETE
USING (auth.uid() = user_id);