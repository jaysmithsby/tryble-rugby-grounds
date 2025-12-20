-- Create storage bucket for custom jersey SVGs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-jerseys', 'custom-jerseys', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view custom jerseys (public bucket)
CREATE POLICY "Custom jerseys are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-jerseys');

-- Allow admins to upload custom jerseys
CREATE POLICY "Admins can upload custom jerseys"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-jerseys' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update custom jerseys
CREATE POLICY "Admins can update custom jerseys"
ON storage.objects FOR UPDATE
USING (bucket_id = 'custom-jerseys' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete custom jerseys
CREATE POLICY "Admins can delete custom jerseys"
ON storage.objects FOR DELETE
USING (bucket_id = 'custom-jerseys' AND public.has_role(auth.uid(), 'admin'::app_role));