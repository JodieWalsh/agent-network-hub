-- Create Supabase Storage buckets for property images and floor plans
-- Storage structure: {bucket}/{user_id}/{property_id}/filename

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('property-images', 'property-images', true),
  ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PROPERTY IMAGES BUCKET POLICIES
-- ============================================================================

-- SELECT: Anyone can view property images
CREATE POLICY "property_images_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- INSERT: Only verified_professional can upload to their own folder
CREATE POLICY "property_images_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND public.has_role(auth.uid(), 'verified_professional')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Users can update their own files
CREATE POLICY "property_images_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Users can delete their own files, admins can delete any
CREATE POLICY "property_images_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- ============================================================================
-- FLOOR PLANS BUCKET POLICIES
-- ============================================================================

-- SELECT: Anyone can view floor plans
CREATE POLICY "floor_plans_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'floor-plans');

-- INSERT: Only verified_professional can upload to their own folder
CREATE POLICY "floor_plans_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plans'
  AND public.has_role(auth.uid(), 'verified_professional')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Users can update their own files
CREATE POLICY "floor_plans_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'floor-plans'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Users can delete their own files, admins can delete any
CREATE POLICY "floor_plans_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'floor-plans'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
