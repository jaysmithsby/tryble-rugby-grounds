-- Create tournament-sponsors storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-sponsors', 'tournament-sponsors', true);

-- RLS Policies for tournament-sponsors bucket
CREATE POLICY "Tournament sponsor logos are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tournament-sponsors');

CREATE POLICY "Admins can upload tournament sponsor logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-sponsors' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update tournament sponsor logos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tournament-sponsors' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete tournament sponsor logos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tournament-sponsors' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );