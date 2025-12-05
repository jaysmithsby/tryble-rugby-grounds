-- Create enum for school request status
CREATE TYPE public.school_request_status AS ENUM ('pending', 'approved', 'declined');

-- Create enum for school type
CREATE TYPE public.school_type AS ENUM ('boys', 'girls', 'co-ed');

-- Create school_requests table
CREATE TABLE public.school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  province TEXT NOT NULL,
  school_type school_type NOT NULL,
  logo_url TEXT,
  note_to_admin TEXT,
  submitted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status school_request_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create school requests"
ON public.school_requests
FOR INSERT
WITH CHECK (auth.uid() = submitted_by_user_id OR submitted_by_user_id IS NULL);

CREATE POLICY "Users can view their own requests"
ON public.school_requests
FOR SELECT
USING (auth.uid() = submitted_by_user_id);

CREATE POLICY "Admins can view all requests"
ON public.school_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests"
ON public.school_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests"
ON public.school_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for school request logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-request-logos', 'school-request-logos', true);

-- Storage policies
CREATE POLICY "Anyone can upload school request logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'school-request-logos');

CREATE POLICY "School request logos are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'school-request-logos');