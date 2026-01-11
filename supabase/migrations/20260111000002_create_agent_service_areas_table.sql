-- Agent service areas table (hybrid model)
-- Supports: radius, region, state, country, global coverage
-- Allows multiple service areas per agent

CREATE TABLE IF NOT EXISTS public.agent_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Service area type
  area_type VARCHAR(50) NOT NULL,
  -- Values: 'radius', 'region', 'state', 'country', 'global'

  -- For radius-based coverage
  center_point GEOGRAPHY(POINT, 4326),
  center_name VARCHAR(255), -- Human-readable name (e.g., "Sydney CBD")
  radius_km NUMERIC(10, 2),

  -- For region-based coverage
  region_id UUID REFERENCES public.locations(id),
  region_name VARCHAR(255), -- Denormalized for performance

  -- For state/country level coverage
  country_code CHAR(2),
  country_name VARCHAR(100),
  state_code VARCHAR(10),
  state_name VARCHAR(100),

  -- Metadata
  is_primary BOOLEAN DEFAULT false, -- Primary service area
  priority INTEGER DEFAULT 1, -- Lower number = higher priority

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_area_type CHECK (
    area_type IN ('radius', 'region', 'state', 'country', 'global')
  ),

  -- Ensure data integrity per type
  CONSTRAINT radius_requires_center CHECK (
    area_type != 'radius' OR (center_point IS NOT NULL AND radius_km IS NOT NULL AND center_name IS NOT NULL)
  ),
  CONSTRAINT region_requires_region CHECK (
    area_type != 'region' OR (region_id IS NOT NULL OR region_name IS NOT NULL)
  ),
  CONSTRAINT state_requires_state CHECK (
    area_type != 'state' OR (state_code IS NOT NULL AND country_code IS NOT NULL)
  ),
  CONSTRAINT country_requires_country CHECK (
    area_type != 'country' OR country_code IS NOT NULL
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_areas_agent ON public.agent_service_areas(agent_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_type ON public.agent_service_areas(area_type);
CREATE INDEX IF NOT EXISTS idx_service_areas_region ON public.agent_service_areas(region_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_country ON public.agent_service_areas(country_code);
CREATE INDEX IF NOT EXISTS idx_service_areas_state ON public.agent_service_areas(state_code);
CREATE INDEX IF NOT EXISTS idx_service_areas_priority ON public.agent_service_areas(agent_id, is_primary DESC, priority ASC);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_service_areas_center_gist ON public.agent_service_areas USING GIST(center_point);

-- RLS Policies
ALTER TABLE public.agent_service_areas ENABLE ROW LEVEL SECURITY;

-- Anyone can view service areas
CREATE POLICY "service_areas_select_policy"
ON public.agent_service_areas FOR SELECT
TO public
USING (true);

-- Users can insert their own service areas
CREATE POLICY "service_areas_insert_policy"
ON public.agent_service_areas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = agent_id);

-- Users can update their own service areas
CREATE POLICY "service_areas_update_policy"
ON public.agent_service_areas FOR UPDATE
TO authenticated
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

-- Users can delete their own service areas
CREATE POLICY "service_areas_delete_policy"
ON public.agent_service_areas FOR DELETE
TO authenticated
USING (auth.uid() = agent_id);

-- Admins can manage all service areas
CREATE POLICY "service_areas_admin_all_policy"
ON public.agent_service_areas FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER trigger_service_areas_updated_at
BEFORE UPDATE ON public.agent_service_areas
FOR EACH ROW
EXECUTE FUNCTION update_locations_updated_at();

-- Helper function: Insert radius-based service area
CREATE OR REPLACE FUNCTION public.insert_radius_service_area(
  p_agent_id UUID,
  p_center_name VARCHAR,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC,
  p_is_primary BOOLEAN DEFAULT false,
  p_priority INTEGER DEFAULT 1
)
RETURNS UUID
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.agent_service_areas (
    agent_id,
    area_type,
    center_point,
    center_name,
    radius_km,
    is_primary,
    priority
  ) VALUES (
    p_agent_id,
    'radius',
    ST_MakePoint(p_lng, p_lat)::geography,
    p_center_name,
    p_radius_km,
    p_is_primary,
    p_priority
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Find agents serving a location
CREATE OR REPLACE FUNCTION public.find_agents_serving_location(
  search_lat NUMERIC,
  search_lng NUMERIC,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  agent_id UUID,
  distance_km NUMERIC,
  service_area_type VARCHAR,
  is_primary_area BOOLEAN,
  area_name VARCHAR
)
AS $$
BEGIN
  RETURN QUERY
  WITH search_point AS (
    SELECT ST_MakePoint(search_lng, search_lat)::geography AS geog
  )
  SELECT DISTINCT
    sa.agent_id,
    CASE
      WHEN sa.area_type = 'radius' THEN
        ROUND(CAST(ST_Distance(sa.center_point, sp.geog) / 1000 AS NUMERIC), 1)
      ELSE NULL
    END AS distance_km,
    sa.area_type AS service_area_type,
    sa.is_primary AS is_primary_area,
    COALESCE(
      sa.center_name,
      sa.region_name,
      sa.state_name,
      sa.country_name,
      'Global'
    ) AS area_name
  FROM public.agent_service_areas sa
  CROSS JOIN search_point sp
  WHERE
    -- Radius match
    (sa.area_type = 'radius' AND ST_DWithin(sa.center_point, sp.geog, sa.radius_km * 1000))
    OR
    -- Global coverage matches everything
    (sa.area_type = 'global')
    -- TODO: Add region, state, country matching when locations table is populated
  ORDER BY
    distance_km ASC NULLS LAST,
    sa.is_primary DESC,
    sa.priority ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
