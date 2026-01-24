-- Add email column to profiles table
-- This makes it easier to display user emails in the admin dashboard

-- Add the email column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Populate email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
