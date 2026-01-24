-- Create storage bucket for inspection report photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,  -- Public bucket so photos can be viewed by job posters
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspection-photos bucket

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos'
);

-- Allow anyone to view photos (since bucket is public)
CREATE POLICY "Anyone can view inspection photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inspection-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update their own inspection photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'inspection-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
