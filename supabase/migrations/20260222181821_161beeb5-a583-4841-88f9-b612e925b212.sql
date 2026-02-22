
-- 1. Add school_id column
ALTER TABLE public.profiles
  ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 2. Backfill school_id from existing school_name
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.school_name = s.name
  AND s.is_archived = false;

-- 3. Rename school_name -> school_name_legacy
ALTER TABLE public.profiles
  RENAME COLUMN school_name TO school_name_legacy;

-- 4. Make school_name_legacy nullable (new users will use school_id)
ALTER TABLE public.profiles
  ALTER COLUMN school_name_legacy DROP NOT NULL;

-- 5. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (
    id, first_name, contact_method, contact_value,
    user_type, school_id, school_name_legacy
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'contact_method', 'email'),
    coalesce(new.raw_user_meta_data->>'contact_value', new.email),
    coalesce(new.raw_user_meta_data->>'user_type', 'fan'),
    (new.raw_user_meta_data->>'school_id')::uuid,
    coalesce(new.raw_user_meta_data->>'school_name', '')
  );
  return new;
end;
$$;

-- 6. Recreate profiles_public view with school join
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.display_name,
  p.username,
  COALESCE(s.name, p.school_name_legacy) AS school_name,
  p.province,
  p.country,
  p.created_at
FROM public.profiles p
LEFT JOIN public.schools s ON p.school_id = s.id;
