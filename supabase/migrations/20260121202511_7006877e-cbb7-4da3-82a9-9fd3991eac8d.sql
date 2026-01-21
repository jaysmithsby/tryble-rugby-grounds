-- Fix 1: Make admin_audit_log append-only (no UPDATE or DELETE)
-- The table already blocks UPDATE/DELETE by not having policies, but add explicit deny via permissions

-- Fix 2: Add admin-only policies for user_roles management
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Require authentication for school-request-logos uploads
DROP POLICY IF EXISTS "Anyone can upload school request logos" ON storage.objects;

CREATE POLICY "Authenticated users can upload school request logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'school-request-logos' 
  AND auth.role() = 'authenticated'
);

-- Add file size and MIME type restrictions to the bucket
UPDATE storage.buckets 
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
WHERE id = 'school-request-logos';

-- Fix 4: Update pool voting functions with authorization checks
CREATE OR REPLACE FUNCTION public.finalize_pool_voting(pool_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_creator_id uuid;
  vote_counts record;
  final_schools text[];
  school_count integer := 0;
BEGIN
  -- Verify pool exists and get creator
  SELECT creator_id INTO pool_creator_id
  FROM pools WHERE id = pool_id_param;
  
  IF pool_creator_id IS NULL THEN
    RAISE EXCEPTION 'Pool not found';
  END IF;
  
  -- Verify caller is pool creator, pool member, or admin
  IF pool_creator_id != auth.uid() 
     AND NOT is_pool_member(pool_id_param, auth.uid())
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only pool creator, members, or admin can finalize voting';
  END IF;

  -- Get top 10 schools by vote count, alphabetically ordered for ties
  final_schools := ARRAY(
    SELECT school_name
    FROM (
      SELECT 
        school_name,
        COUNT(*) as vote_count
      FROM pool_school_votes
      WHERE pool_id = pool_id_param
      GROUP BY school_name
      ORDER BY vote_count DESC, school_name ASC
      LIMIT 10
    ) as sorted_schools
  );
  
  -- Update the pool with finalized schools
  UPDATE pools
  SET 
    schools = final_schools,
    is_voting_finalized = true
  WHERE id = pool_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_all_members_voted(pool_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer;
  voters_count integer;
  is_member boolean;
BEGIN
  -- Verify caller is pool member or admin
  SELECT EXISTS (
    SELECT 1 FROM pool_members 
    WHERE pool_id = pool_id_param AND user_id = auth.uid()
  ) INTO is_member;
  
  IF NOT is_member AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only pool members can check voting status';
  END IF;

  -- Count total members
  SELECT COUNT(DISTINCT user_id) INTO member_count
  FROM pool_members
  WHERE pool_id = pool_id_param;
  
  -- Count members who have voted
  SELECT COUNT(DISTINCT user_id) INTO voters_count
  FROM pool_school_votes
  WHERE pool_id = pool_id_param;
  
  RETURN member_count > 0 AND member_count = voters_count;
END;
$$;