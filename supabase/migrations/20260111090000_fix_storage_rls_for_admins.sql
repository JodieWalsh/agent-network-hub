-- Fix Storage RLS policies to allow BOTH admins and verified_professionals
-- Same issue as properties table - storage policies blocked admins from uploading
--
-- BUG: Admin users got "new row violates row-level security policy" when uploading images
-- ROOT CAUSE: Storage INSERT policies only checked for verified_professional role
-- FIX: Add OR public.is_admin(auth.uid()) to allow admins

-- ============================================================================
-- PROPERTY IMAGES BUCKET
-- ============================================================================

-- Drop old restrictive INSERT policy
DROP POLICY IF EXISTS "property_images_insert_policy" ON storage.objects;

-- Recreate with admin support
CREATE POLICY "property_images_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (public.has_role(auth.uid(), 'verified_professional') OR public.is_admin(auth.uid()))
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- FLOOR PLANS BUCKET
-- ============================================================================

-- Drop old restrictive INSERT policy
DROP POLICY IF EXISTS "floor_plans_insert_policy" ON storage.objects;

-- Recreate with admin support
CREATE POLICY "floor_plans_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plans'
  AND (public.has_role(auth.uid(), 'verified_professional') OR public.is_admin(auth.uid()))
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: SELECT and DELETE policies already work fine (no role check on SELECT, admins can delete via is_admin check)
