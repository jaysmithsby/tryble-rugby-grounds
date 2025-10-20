-- Fix infinite recursion in pool_members RLS policies
-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Pool members are viewable by pool members" ON public.pool_members;

-- Create a new policy that doesn't cause recursion
-- Members can view pool members if they're in that pool OR if they're the pool creator
CREATE POLICY "Pool members are viewable by pool members" 
ON public.pool_members 
FOR SELECT 
USING (
  pool_id IN (
    SELECT id FROM pools 
    WHERE creator_id = auth.uid()
  )
  OR
  user_id = auth.uid()
);

-- Add a table for predefined pool templates
CREATE TABLE IF NOT EXISTS public.pool_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  schools text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on pool_templates
ALTER TABLE public.pool_templates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view pool templates
CREATE POLICY "Pool templates are viewable by everyone" 
ON public.pool_templates 
FOR SELECT 
USING (true);

-- Insert predefined pool templates
INSERT INTO public.pool_templates (name, description, schools) VALUES
  ('KZN Top', 'Top rugby schools in KwaZulu-Natal', ARRAY['Hilton College', 'Maritzburg College', 'Kearsney College', 'Glenwood High School', 'Westville Boys High School']),
  ('Gauteng Top', 'Elite Gauteng rugby schools', ARRAY['Affies', 'Grey College Bloemfontein', 'Monument', 'Jeppe', 'KES']),
  ('KZN Underdogs', 'Rising KZN rugby talent', ARRAY['Northwood', 'DHS', 'Michaelhouse', 'St Charles College', 'Clifton']),
  ('Western Cape Mixed', 'Diverse Western Cape schools', ARRAY['Bishops', 'Rondebosch', 'SACS', 'Wynberg', 'Paarl Gim']),
  ('South Africa Top 10', 'Best rugby schools nationwide', ARRAY['Grey College Bloemfontein', 'Paarl Gim', 'Affies', 'Oakdale', 'Paul Roos', 'Monument', 'Paarl Boys High', 'Grey High School', 'Helpmekaar', 'Maritzburg College'])
ON CONFLICT DO NOTHING;