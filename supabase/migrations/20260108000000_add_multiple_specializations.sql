-- Change specialization from single value to array
-- First, add the new column as an array
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data from specialization to specializations array
UPDATE public.profiles
SET specializations = ARRAY[specialization::TEXT]
WHERE specialization IS NOT NULL;

-- Drop the old column
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS specialization;

-- Add latitude and longitude if not exists (for location-based features)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add service regions and home base address
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS service_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS home_base_address TEXT;

-- Create index for specializations array for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_specializations ON public.profiles USING GIN (specializations);
