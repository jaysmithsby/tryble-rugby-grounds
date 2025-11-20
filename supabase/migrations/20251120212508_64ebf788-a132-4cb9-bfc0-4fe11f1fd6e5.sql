-- Create predictions table for storing user match predictions
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_team TEXT NOT NULL CHECK (predicted_team IN ('home', 'away')),
  predicted_margin INTEGER NOT NULL CHECK (predicted_margin > 0 AND predicted_margin <= 50),
  points_earned INTEGER NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fixture_id, user_id)
);

-- Add index for faster queries
CREATE INDEX idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX idx_predictions_fixture_id ON public.predictions(fixture_id);

-- Add trigger for updated_at
CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can insert their own predictions
CREATE POLICY "Users can insert their own predictions"
  ON public.predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can view their own predictions
CREATE POLICY "Users can view their own predictions"
  ON public.predictions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own predictions (before match starts)
CREATE POLICY "Users can update their own predictions"
  ON public.predictions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own predictions
CREATE POLICY "Users can delete their own predictions"
  ON public.predictions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all predictions
CREATE POLICY "Admins can view all predictions"
  ON public.predictions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can update all predictions (for points_earned calculation)
CREATE POLICY "Admins can update all predictions"
  ON public.predictions
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));