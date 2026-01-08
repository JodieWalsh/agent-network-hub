-- Update Row Level Security policies for role-based access control
-- Ensures security at database level, not just application level

-- ============================================================================
-- PROPERTIES TABLE RLS POLICIES
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;

-- SELECT: Public sees only approved properties, owners see their own, admins see all
CREATE POLICY "properties_select_policy"
ON public.properties FOR SELECT
USING (
  approval_status = 'approved'
  OR owner_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- INSERT: Only verified_professional role can insert properties
CREATE POLICY "properties_insert_policy"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'verified_professional')
  AND auth.uid() = owner_id
);

-- UPDATE: Owners can update their own properties, admins can update any
CREATE POLICY "properties_update_policy"
ON public.properties FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_admin(auth.uid())
);

-- DELETE: Only admins can delete properties
CREATE POLICY "properties_delete_policy"
ON public.properties FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop old profile update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- UPDATE: Users can update their own profile (but NOT role or approval_status)
CREATE POLICY "profiles_update_own_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing their own role or approval_status
  AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  AND (approval_status = (SELECT approval_status FROM public.profiles WHERE id = auth.uid()))
);

-- UPDATE: Admins can update any profile (including role and approval_status)
CREATE POLICY "profiles_update_admin_policy"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));
