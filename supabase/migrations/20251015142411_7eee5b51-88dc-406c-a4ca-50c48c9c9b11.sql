-- Create fixtures table
CREATE TABLE public.fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_school_id UUID NOT NULL,
  away_school_id UUID NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Rugby',
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  home_score INTEGER,
  away_score INTEGER,
  season TEXT NOT NULL,
  year INTEGER NOT NULL,
  festival_id UUID,
  is_derby BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  round_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- Everyone can view visible fixtures
CREATE POLICY "Fixtures are viewable by everyone"
ON public.fixtures
FOR SELECT
USING (is_visible = true OR auth.uid() IS NOT NULL);

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Only admins can create/update/delete fixtures
CREATE POLICY "Admins can insert fixtures"
ON public.fixtures
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fixtures"
ON public.fixtures
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fixtures"
ON public.fixtures
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function for fixtures
CREATE OR REPLACE FUNCTION public.update_fixtures_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_fixtures_updated_at
BEFORE UPDATE ON public.fixtures
FOR EACH ROW
EXECUTE FUNCTION public.update_fixtures_updated_at();