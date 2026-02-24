
CREATE TABLE public.springboks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cap_number INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  debut_year INTEGER NOT NULL,
  high_school TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  matric_year TEXT,
  craven_week TEXT,
  sa_schools TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.springboks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Springboks are viewable by everyone"
  ON public.springboks FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert springboks"
  ON public.springboks FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update springboks"
  ON public.springboks FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete springboks"
  ON public.springboks FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_springboks_school_id ON public.springboks(school_id);
