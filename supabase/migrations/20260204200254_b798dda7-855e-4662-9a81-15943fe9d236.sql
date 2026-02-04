-- Fix user_scores: Restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "User scores are viewable by everyone" ON public.user_scores;

CREATE POLICY "User scores are viewable by authenticated users"
  ON public.user_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix school_scores: Add write protection (admin only)
-- Keep public SELECT for leaderboards
CREATE POLICY "Only admins can insert school scores"
  ON public.school_scores
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update school scores"
  ON public.school_scores
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete school scores"
  ON public.school_scores
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));