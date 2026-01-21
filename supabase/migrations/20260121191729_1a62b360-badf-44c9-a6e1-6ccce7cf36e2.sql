-- Create news_articles table for admin-managed news
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create advertisements table for ad management
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- News articles policies (public read, admin write)
CREATE POLICY "News articles are viewable by everyone"
ON public.news_articles
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert news articles"
ON public.news_articles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update news articles"
ON public.news_articles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete news articles"
ON public.news_articles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Advertisements policies (public read, admin write)
CREATE POLICY "Advertisements are viewable by everyone"
ON public.advertisements
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert advertisements"
ON public.advertisements
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update advertisements"
ON public.advertisements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete advertisements"
ON public.advertisements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to increment ad impressions (public access for tracking)
CREATE OR REPLACE FUNCTION public.increment_ad_impression(ad_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE advertisements SET impressions = impressions + 1 WHERE id = ad_id;
$$;

-- Create function to increment ad clicks (public access for tracking)
CREATE OR REPLACE FUNCTION public.increment_ad_click(ad_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE advertisements SET clicks = clicks + 1 WHERE id = ad_id;
$$;