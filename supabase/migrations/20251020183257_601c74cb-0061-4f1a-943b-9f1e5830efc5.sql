-- Create game_scores table for weekend score submissions
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own scores
CREATE POLICY "Users can view their own scores"
ON public.game_scores
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scores (time validation is in edge function)
CREATE POLICY "Users can insert their own scores"
ON public.game_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can update scores (for review process)
CREATE POLICY "Admins can update scores"
ON public.game_scores
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_game_scores_updated_at
BEFORE UPDATE ON public.game_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_fixtures_updated_at();

-- Create index for faster queries
CREATE INDEX idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX idx_game_scores_status ON public.game_scores(status);
CREATE INDEX idx_game_scores_submitted_at ON public.game_scores(submitted_at DESC);