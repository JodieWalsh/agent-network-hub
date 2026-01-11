-- Update client_briefs table for flexible location preferences
-- Clients can specify:
-- - Preferred suburbs/areas (with priority)
-- - Excluded areas
-- - Radius around a point
-- - "Anywhere in [Region/State/Country]"

-- Create client_brief_locations table for multiple location preferences
CREATE TABLE IF NOT EXISTS public.client_brief_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.client_briefs(id) ON DELETE CASCADE,

  -- Location type
  location_type VARCHAR(50) NOT NULL,
  -- Values: 'preferred_suburb', 'preferred_region', 'excluded_area', 'radius', 'anywhere_in_state', 'anywhere_in_country'

  -- Location details
  location_name VARCHAR(255) NOT NULL, -- Human-readable name
  location_id UUID REFERENCES public.locations(id), -- Link to locations table (when populated)

  -- For radius-based searches
  center_point GEOGRAPHY(POINT, 4326),
  radius_km NUMERIC(10, 2),

  -- For structured locations
  suburb VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  country_code CHAR(2),
  state_code VARCHAR(10),

  -- Priority (for preferred locations)
  priority INTEGER DEFAULT 1, -- 1 = highest priority
  is_must_have BOOLEAN DEFAULT false, -- If true, property MUST be in this location

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_location_type CHECK (
    location_type IN ('preferred_suburb', 'preferred_region', 'excluded_area', 'radius', 'anywhere_in_state', 'anywhere_in_country')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brief_locations_brief ON public.client_brief_locations(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_locations_type ON public.client_brief_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_brief_locations_priority ON public.client_brief_locations(brief_id, priority ASC);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_brief_locations_center_gist ON public.client_brief_locations USING GIST(center_point);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_brief_locations_name_trgm ON public.client_brief_locations USING GIN(location_name gin_trgm_ops);

-- RLS Policies
ALTER TABLE public.client_brief_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own brief locations
CREATE POLICY "brief_locations_select_policy"
ON public.client_brief_locations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
);

-- Users can insert locations for their own briefs
CREATE POLICY "brief_locations_insert_policy"
ON public.client_brief_locations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
);

-- Users can update locations for their own briefs
CREATE POLICY "brief_locations_update_policy"
ON public.client_brief_locations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
);

-- Users can delete locations for their own briefs
CREATE POLICY "brief_locations_delete_policy"
ON public.client_brief_locations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
);

-- Trigger to update updated_at
CREATE TRIGGER trigger_brief_locations_updated_at
BEFORE UPDATE ON public.client_brief_locations
FOR EACH ROW
EXECUTE FUNCTION update_locations_updated_at();

-- Add new columns to client_briefs table for quick summary
ALTER TABLE public.client_briefs
ADD COLUMN IF NOT EXISTS location_summary TEXT; -- e.g., "Bondi, Coogee, Eastern Suburbs (Sydney)"

-- Helper function: Find properties matching client brief location preferences
CREATE OR REPLACE FUNCTION public.find_properties_for_brief(
  p_brief_id UUID,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  property_id UUID,
  title VARCHAR,
  city VARCHAR,
  price NUMERIC,
  match_score INTEGER,
  matched_location VARCHAR
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.title,
    p.city,
    p.price,
    100 AS match_score, -- Simplified for MVP, will be enhanced in Phase 2
    cbl.location_name AS matched_location
  FROM public.properties p
  CROSS JOIN public.client_brief_locations cbl
  WHERE
    cbl.brief_id = p_brief_id
    AND cbl.location_type != 'excluded_area'
    AND p.approval_status = 'approved'
    AND (
      -- Radius match
      (cbl.location_type = 'radius' AND p.coordinates IS NOT NULL AND ST_DWithin(p.coordinates, cbl.center_point, cbl.radius_km * 1000))
      OR
      -- City match (simple text match for MVP)
      (cbl.location_type IN ('preferred_suburb', 'preferred_region') AND p.city ILIKE '%' || cbl.city || '%')
    )
    -- Exclude excluded areas
    AND NOT EXISTS (
      SELECT 1 FROM public.client_brief_locations excl
      WHERE excl.brief_id = p_brief_id
        AND excl.location_type = 'excluded_area'
        AND p.city ILIKE '%' || excl.city || '%'
    )
  ORDER BY
    cbl.priority ASC,
    p.price ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
