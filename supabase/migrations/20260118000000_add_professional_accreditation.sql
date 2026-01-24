-- Add professional_accreditation column to profiles table
-- This field stores the user's professional credentials for verification

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS professional_accreditation TEXT;

-- Add index for querying profiles with pending accreditation
CREATE INDEX IF NOT EXISTS idx_profiles_accreditation ON public.profiles(professional_accreditation)
WHERE professional_accreditation IS NOT NULL;

COMMENT ON COLUMN public.profiles.professional_accreditation IS 'Professional credentials and licenses submitted for verification';
