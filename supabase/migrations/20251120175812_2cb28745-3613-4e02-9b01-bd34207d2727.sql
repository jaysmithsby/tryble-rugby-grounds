-- Create a public storage bucket for school jerseys
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-jerseys', 'school-jerseys', true);

-- Allow anyone to view school jerseys (public read)
CREATE POLICY "School jerseys are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'school-jerseys');

-- Allow authenticated users to upload school jerseys
CREATE POLICY "Authenticated users can upload school jerseys"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'school-jerseys' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update school jerseys
CREATE POLICY "Authenticated users can update school jerseys"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'school-jerseys' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete school jerseys
CREATE POLICY "Authenticated users can delete school jerseys"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'school-jerseys' 
  AND auth.role() = 'authenticated'
);