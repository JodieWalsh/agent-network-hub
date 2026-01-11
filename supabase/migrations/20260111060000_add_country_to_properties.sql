-- Add country column to properties table for global property support
-- This enables worldwide property listings (not just Australia)

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Create index for country searches
CREATE INDEX IF NOT EXISTS idx_properties_country ON public.properties(country);

-- Backfill existing properties with 'Australia' (reasonable default based on current data)
-- Can be updated manually or through UI for international properties
UPDATE public.properties
SET country = 'Australia'
WHERE country IS NULL AND city IS NOT NULL;
