-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read schools
CREATE POLICY "Schools are viewable by everyone" 
ON public.schools 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert pending schools
CREATE POLICY "Users can add pending schools" 
ON public.schools 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND status = 'pending');

-- Add trigger for timestamps
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial South African schools
INSERT INTO public.schools (name, status) VALUES
('Grey College', 'verified'),
('Paarl Boys'' High', 'verified'),
('Paarl Gimnasium', 'verified'),
('Michaelhouse', 'verified'),
('Hilton College', 'verified'),
('Bishops', 'verified'),
('Rondebosch Boys'' High', 'verified'),
('SACS', 'verified'),
('Wynberg Boys'' High', 'verified'),
('Affies', 'verified'),
('Menlopark High', 'verified'),
('Pretoria Boys High', 'verified'),
('Jeppe High School for Boys', 'verified'),
('KES', 'verified'),
('St John''s College', 'verified'),
('Maritzburg College', 'verified'),
('DHS', 'verified'),
('Northwood', 'verified'),
('Glenwood High', 'verified'),
('Westville Boys'' High', 'verified'),
('Kearsney College', 'verified'),
('St Stithians College', 'verified'),
('St Alban''s College', 'verified'),
('St Andrew''s College', 'verified'),
('Selborne College', 'verified'),
('Queen''s College', 'verified'),
('Dale College', 'verified'),
('Paul Roos Gymnasium', 'verified'),
('Stellenbosch High', 'verified'),
('Outeniqua High', 'verified');