-- Fix RLS policies for profiles SELECT
-- Issue: Profile queries were hanging because SELECT policy was missing or incorrect

-- Drop old/conflicting SELECT policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Allow authenticated users to view all profiles
-- This is needed for the agent directory, marketplace, etc.
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to view approved profiles (for public directory browsing)
CREATE POLICY "profiles_select_anon"
ON public.profiles FOR SELECT
TO anon
USING (approval_status = 'approved');
