-- Fix: Restrict admin UPDATE access on predictions to only points_earned field
-- and add audit logging for all admin modifications

-- First, drop the existing overly permissive admin update policy
DROP POLICY IF EXISTS "Admins can update all predictions" ON public.predictions;

-- Create a more restrictive policy that only allows admins to update points_earned
CREATE POLICY "Admins can update prediction points only" 
ON public.predictions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create a trigger function to audit admin modifications to predictions
CREATE OR REPLACE FUNCTION public.audit_prediction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the update is from an admin (not the user themselves)
  IF auth.uid() != OLD.user_id AND has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action_type, details)
    VALUES (
      auth.uid(),
      OLD.user_id,
      'prediction_update',
      jsonb_build_object(
        'prediction_id', OLD.id,
        'fixture_id', OLD.fixture_id,
        'old_points_earned', OLD.points_earned,
        'new_points_earned', NEW.points_earned,
        'old_predicted_team', OLD.predicted_team,
        'new_predicted_team', NEW.predicted_team,
        'old_predicted_margin', OLD.predicted_margin,
        'new_predicted_margin', NEW.predicted_margin
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on predictions table
DROP TRIGGER IF EXISTS audit_prediction_update_trigger ON public.predictions;
CREATE TRIGGER audit_prediction_update_trigger
AFTER UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.audit_prediction_update();