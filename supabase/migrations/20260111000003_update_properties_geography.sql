-- Update properties table to use PostGIS geography columns for precise location
-- Properties need exact coordinates (street address level)

-- Add new geography column
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS coordinates GEOGRAPHY(POINT, 4326);

-- Add full address field
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Add structured address fields
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS postcode VARCHAR(20);

-- Migrate existing latitude/longitude to geography column
-- Only if both latitude and longitude exist
UPDATE public.properties
SET coordinates = ST_MakePoint(longitude, latitude)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND coordinates IS NULL;

-- Create spatial index on coordinates
CREATE INDEX IF NOT EXISTS idx_properties_coords_gist ON public.properties USING GIST(coordinates);

-- Create text search index on address fields
CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON public.properties USING GIN(city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_suburb_trgm ON public.properties USING GIN(suburb gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_street_trgm ON public.properties USING GIN(street_address gin_trgm_ops);

-- Helper function: Find properties near location
CREATE OR REPLACE FUNCTION public.find_properties_near_location(
  search_lat NUMERIC,
  search_lng NUMERIC,
  radius_km NUMERIC DEFAULT 25,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  property_id UUID,
  title VARCHAR,
  city VARCHAR,
  price NUMERIC,
  distance_km NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  WITH search_point AS (
    SELECT ST_MakePoint(search_lng, search_lat)::geography AS geog
  )
  SELECT
    p.id AS property_id,
    p.title,
    p.city,
    p.price,
    ROUND(CAST(ST_Distance(p.coordinates, sp.geog) / 1000 AS NUMERIC), 1) AS distance_km
  FROM public.properties p
  CROSS JOIN search_point sp
  WHERE
    p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates, sp.geog, radius_km * 1000)
    AND p.approval_status = 'approved'
  ORDER BY
    distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Note: Keep existing latitude/longitude columns for backward compatibility
-- They can be deprecated in a future migration after UI is updated
