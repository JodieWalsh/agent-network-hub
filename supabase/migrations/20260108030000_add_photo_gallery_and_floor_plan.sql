-- Add photo gallery and floor plan fields to properties

-- Photo gallery (up to 15 photos)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS photo_count INTEGER GENERATED ALWAYS AS (array_length(photo_urls, 1)) STORED;

-- Floor plan
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

-- Create GIN index for photo URLs array for potential searching
CREATE INDEX IF NOT EXISTS idx_properties_photos ON public.properties USING GIN (photo_urls);

-- Note: latitude and longitude already exist from migration 20260108010000_add_comprehensive_property_attributes.sql
-- They were added in the comprehensive attributes migration
