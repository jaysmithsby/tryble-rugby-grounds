-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Pool members are viewable by pool members" ON public.pool_members;
DROP POLICY IF EXISTS "Pools are viewable by members" ON public.pools;

-- Create a security definer function to check pool membership
CREATE OR REPLACE FUNCTION public.is_pool_member(_pool_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pool_members
    WHERE pool_id = _pool_id
      AND user_id = _user_id
  )
$$;

-- Create a security definer function to check if user is pool creator
CREATE OR REPLACE FUNCTION public.is_pool_creator(_pool_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pools
    WHERE id = _pool_id
      AND creator_id = _user_id
  )
$$;

-- Recreate pool_members SELECT policy without recursion
CREATE POLICY "Pool members are viewable by pool members" 
ON public.pool_members 
FOR SELECT 
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- User can see members of pools they created
  public.is_pool_creator(pool_id, auth.uid())
  OR
  -- User can see members of pools they belong to
  public.is_pool_member(pool_id, auth.uid())
);

-- Recreate pools SELECT policy without recursion
CREATE POLICY "Pools are viewable by members" 
ON public.pools 
FOR SELECT 
USING (
  -- User is the creator
  creator_id = auth.uid()
  OR
  -- User is a member
  public.is_pool_member(id, auth.uid())
);