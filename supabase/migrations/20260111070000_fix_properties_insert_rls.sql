-- Fix RLS policy to allow BOTH admins and verified_professionals to insert properties
-- Previous policy only allowed verified_professional role, blocking admins
--
-- BUG: Admin users got "new row violates row-level security policy" error
-- ROOT CAUSE: INSERT policy checked for verified_professional only, not admin
-- FIX: Add OR public.is_admin(auth.uid()) to allow admins

-- Drop the restrictive policy
DROP POLICY IF EXISTS "properties_insert_policy" ON public.properties;

-- Recreate with proper permissions for both admins and verified professionals
CREATE POLICY "properties_insert_policy"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow BOTH verified professionals AND admins to insert properties
  (public.has_role(auth.uid(), 'verified_professional') OR public.is_admin(auth.uid()))
  AND auth.uid() = owner_id
);

-- Explanation:
-- - public.has_role(auth.uid(), 'verified_professional'): Allows verified professionals
-- - public.is_admin(auth.uid()): Allows admins
-- - auth.uid() = owner_id: User must be the owner of the property they're inserting
-- - All three conditions ensure security while allowing authorized users to submit properties
