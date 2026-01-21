-- Create a SECURITY DEFINER function to lookup pools by invite code
-- This bypasses RLS to allow non-members to find pools they want to join
CREATE OR REPLACE FUNCTION public.get_pool_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT, creator_id UUID, is_active BOOLEAN) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, creator_id, is_active
  FROM pools 
  WHERE invite_code = upper(code);
$$;