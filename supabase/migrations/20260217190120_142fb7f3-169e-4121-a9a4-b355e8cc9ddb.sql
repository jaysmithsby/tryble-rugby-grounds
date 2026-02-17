
-- School Invitations table
CREATE TABLE public.school_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  contact_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  otp_code text,
  otp_expires_at timestamptz,
  otp_attempts int NOT NULL DEFAULT 0,
  otp_verified boolean NOT NULL DEFAULT false,
  expiry_days int NOT NULL DEFAULT 7
);

ALTER TABLE public.school_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select school invitations"
  ON public.school_invitations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert school invitations"
  ON public.school_invitations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update school invitations"
  ON public.school_invitations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete school invitations"
  ON public.school_invitations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- School Submissions table
CREATE TABLE public.school_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.school_invitations(id) ON DELETE CASCADE,
  full_official_name text NOT NULL,
  nickname text NOT NULL,
  province text NOT NULL,
  year_established int NOT NULL,
  school_motto text,
  main_rival text,
  number_of_springboks int NOT NULL DEFAULT 0,
  school_trivia text,
  crest_image_url text,
  primary_colour text,
  secondary_colour text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select school submissions"
  ON public.school_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE for clients — handled via edge function with service role

-- Storage bucket for crest uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('school-onboarding-crests', 'school-onboarding-crests', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view school onboarding crests"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school-onboarding-crests');

CREATE POLICY "Service role can upload school onboarding crests"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'school-onboarding-crests');
