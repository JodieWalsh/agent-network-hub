-- Fix Orphaned Profiles and Approval Flow
-- This migration:
-- 1. Removes orphaned profiles (profiles without corresponding auth.users entries)
-- 2. Ensures proper foreign key constraint with CASCADE delete
-- 3. Updates existing guests to have 'pending' approval_status for review

-- Step 1: Delete orphaned profiles and their related records
-- This cleans up any profiles that were left behind when users were deleted

-- First, delete inspection bids from orphaned users
DELETE FROM public.inspection_bids
WHERE inspector_id NOT IN (SELECT id FROM auth.users);

-- Delete inspection jobs from orphaned users
DELETE FROM public.inspection_jobs
WHERE requesting_agent_id NOT IN (SELECT id FROM auth.users);

-- Now delete the orphaned profiles
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 2: Verify the foreign key constraint exists with ON DELETE CASCADE
-- If it doesn't exist or doesn't have CASCADE, we need to recreate it
DO $$
BEGIN
  -- Check if the constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    -- Add the foreign key constraint if it doesn't exist
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Update existing guests without a proper approval_status to 'pending'
-- This ensures they appear in the admin approval queue
UPDATE public.profiles
SET approval_status = 'pending'
WHERE role = 'guest'
AND (approval_status IS NULL OR approval_status = 'approved')
AND professional_accreditation IS NOT NULL
AND professional_accreditation != '';

-- Note: We only mark guests with accreditation as pending for review
-- Regular guests without accreditation don't need approval (they have limited access anyway)

-- Add a comment explaining the approval workflow
COMMENT ON COLUMN public.profiles.approval_status IS
'Approval status for professional verification.
- pending: awaiting admin review (shown in admin queue)
- approved: user has been verified by admin
- rejected: user application was rejected';

COMMENT ON COLUMN public.profiles.role IS
'User role determining permissions:
- guest: limited access, can browse but not fully participate
- pending_professional: submitted for approval, awaiting admin review
- verified_professional: approved by admin, full platform access
- admin: full admin access';
