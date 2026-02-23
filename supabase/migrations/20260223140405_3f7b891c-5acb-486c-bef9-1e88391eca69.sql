
-- Add is_fake column to all relevant tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_scores ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_school_follows ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
ALTER TABLE public.pool_members ADD COLUMN IF NOT EXISTS is_fake boolean NOT NULL DEFAULT false;
