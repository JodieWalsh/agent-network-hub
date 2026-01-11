-- Locations table for hierarchical location data
-- Will be populated from GeoNames or Mapbox in Phase 2
-- For Phase 1 (MVP), we'll rely on Mapbox API for autocomplete

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External IDs
  geonames_id INTEGER UNIQUE,
  mapbox_id VARCHAR(255),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  ascii_name VARCHAR(255),
  level VARCHAR(50) NOT NULL, -- 'country', 'state', 'region', 'city', 'suburb', 'postcode'

  -- Hierarchy
  parent_id UUID REFERENCES public.locations(id),
  country_id UUID REFERENCES public.locations(id),
  state_id UUID REFERENCES public.locations(id),
  city_id UUID REFERENCES public.locations(id),

  -- Geographical data
  coordinates GEOGRAPHY(POINT, 4326), -- WGS84 coordinate system
  bbox GEOGRAPHY(POLYGON, 4326), -- Bounding box for regions

  -- Codes
  country_code CHAR(2),
  state_code VARCHAR(10),
  postal_code VARCHAR(20),

  -- Search optimization
  population INTEGER,
  search_rank INTEGER DEFAULT 0, -- Higher = more important

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_level CHECK (
    level IN ('country', 'state', 'region', 'city', 'suburb', 'postcode', 'address')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_level ON public.locations(level);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON public.locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_country ON public.locations(country_id);
CREATE INDEX IF NOT EXISTS idx_locations_country_code ON public.locations(country_code);
CREATE INDEX IF NOT EXISTS idx_locations_search_rank ON public.locations(search_rank DESC);

-- Spatial indexes (PostGIS)
CREATE INDEX IF NOT EXISTS idx_locations_coords_gist ON public.locations USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_locations_bbox_gist ON public.locations USING GIST(bbox);

-- Text search index for autocomplete (trigram)
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON public.locations USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_ascii_trgm ON public.locations USING GIN(ascii_name gin_trgm_ops);

-- RLS Policies (read-only for all users)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_policy"
ON public.locations FOR SELECT
TO public
USING (true);

-- Only admins can insert/update/delete locations
CREATE POLICY "locations_insert_policy"
ON public.locations FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "locations_update_policy"
ON public.locations FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "locations_delete_policy"
ON public.locations FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION update_locations_updated_at();
