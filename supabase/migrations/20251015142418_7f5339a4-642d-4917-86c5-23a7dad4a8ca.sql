-- Fix security warning: Set search_path for trigger function
CREATE OR REPLACE FUNCTION public.update_fixtures_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;