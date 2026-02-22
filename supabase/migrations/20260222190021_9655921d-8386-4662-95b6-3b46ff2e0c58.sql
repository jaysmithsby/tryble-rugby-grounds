
-- Create user_school_follows table
CREATE TABLE public.user_school_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id)
);

-- Enable RLS
ALTER TABLE public.user_school_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view follows"
  ON public.user_school_follows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own follows"
  ON public.user_school_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON public.user_school_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Backfill from existing profiles
INSERT INTO public.user_school_follows (user_id, school_id)
SELECT id, school_id FROM public.profiles
WHERE school_id IS NOT NULL
ON CONFLICT DO NOTHING;
