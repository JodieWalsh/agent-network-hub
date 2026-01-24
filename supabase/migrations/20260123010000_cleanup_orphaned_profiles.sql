-- Clean up orphaned profiles (profiles without corresponding auth.users entries)
-- This happens when a user is deleted from auth.users but their profile remains

-- First, delete inspection bids from orphaned users
DELETE FROM public.inspection_bids
WHERE inspector_id NOT IN (SELECT id FROM auth.users);

-- Delete inspection jobs from orphaned users
DELETE FROM public.inspection_jobs
WHERE requesting_agent_id NOT IN (SELECT id FROM auth.users);

-- Now delete the orphaned profiles
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Also create a trigger to automatically delete profiles when users are deleted
-- This prevents orphaned profiles in the future

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
