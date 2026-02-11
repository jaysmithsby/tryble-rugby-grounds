-- Add icon customization columns to pools table
ALTER TABLE public.pools
ADD COLUMN icon_id text DEFAULT 'trophy',
ADD COLUMN color_id text DEFAULT 'green';