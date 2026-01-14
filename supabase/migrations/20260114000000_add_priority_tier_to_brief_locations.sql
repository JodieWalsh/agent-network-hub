-- Add priority_tier enum for cleaner three-tier location preference system
-- must_have: Primary choices (highest priority)
-- nice_to_have: Would consider (secondary priority)
-- exclude: Do NOT show properties here

CREATE TYPE public.location_priority_tier AS ENUM ('must_have', 'nice_to_have', 'exclude');

-- Add priority_tier column to client_brief_locations
ALTER TABLE public.client_brief_locations
ADD COLUMN priority_tier public.location_priority_tier DEFAULT 'nice_to_have';

-- Update existing data based on location_type and is_must_have
UPDATE public.client_brief_locations
SET priority_tier = CASE
  WHEN location_type = 'excluded_area' THEN 'exclude'::public.location_priority_tier
  WHEN is_must_have = true THEN 'must_have'::public.location_priority_tier
  ELSE 'nice_to_have'::public.location_priority_tier
END;

-- Make priority_tier NOT NULL after data migration
ALTER TABLE public.client_brief_locations
ALTER COLUMN priority_tier SET NOT NULL;

-- Add index for priority_tier filtering
CREATE INDEX IF NOT EXISTS idx_brief_locations_priority_tier ON public.client_brief_locations(brief_id, priority_tier);

-- Update RLS policies to include admins
-- Admins can view all brief locations
DROP POLICY IF EXISTS "brief_locations_select_policy" ON public.client_brief_locations;
CREATE POLICY "brief_locations_select_policy"
ON public.client_brief_locations FOR SELECT
TO authenticated
USING (
  -- Own briefs
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
  OR
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can insert locations for any brief
DROP POLICY IF EXISTS "brief_locations_insert_policy" ON public.client_brief_locations;
CREATE POLICY "brief_locations_insert_policy"
ON public.client_brief_locations FOR INSERT
TO authenticated
WITH CHECK (
  -- Own briefs
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
  OR
  -- Admins can insert for any brief
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update any brief locations
DROP POLICY IF EXISTS "brief_locations_update_policy" ON public.client_brief_locations;
CREATE POLICY "brief_locations_update_policy"
ON public.client_brief_locations FOR UPDATE
TO authenticated
USING (
  -- Own briefs
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
  OR
  -- Admins can update any
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can delete any brief locations
DROP POLICY IF EXISTS "brief_locations_delete_policy" ON public.client_brief_locations;
CREATE POLICY "brief_locations_delete_policy"
ON public.client_brief_locations FOR DELETE
TO authenticated
USING (
  -- Own briefs
  EXISTS (
    SELECT 1 FROM public.client_briefs cb
    WHERE cb.id = brief_id AND cb.agent_id = auth.uid()
  )
  OR
  -- Admins can delete any
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop and recreate find_properties_for_brief function with priority_tier
DROP FUNCTION IF EXISTS public.find_properties_for_brief(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.find_properties_for_brief(
  p_brief_id UUID,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  property_id UUID,
  title VARCHAR,
  city VARCHAR,
  price BIGINT,
  match_score INTEGER,
  matched_location VARCHAR,
  priority_tier VARCHAR
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS property_id,
    p.title,
    p.city,
    p.price,
    CASE
      WHEN cbl.priority_tier = 'must_have' THEN 100
      WHEN cbl.priority_tier = 'nice_to_have' THEN 75
      ELSE 0
    END AS match_score,
    cbl.location_name AS matched_location,
    cbl.priority_tier::VARCHAR AS priority_tier
  FROM public.properties p
  CROSS JOIN public.client_brief_locations cbl
  WHERE
    cbl.brief_id = p_brief_id
    AND cbl.priority_tier != 'exclude'
    AND p.approval_status = 'approved'
    AND (
      -- Radius match (with center_point and radius_km)
      (cbl.radius_km IS NOT NULL AND cbl.center_point IS NOT NULL
       AND p.coordinates IS NOT NULL
       AND ST_DWithin(p.coordinates, cbl.center_point, cbl.radius_km * 1000))
      OR
      -- Exact suburb match (no radius)
      (cbl.radius_km IS NULL AND p.city ILIKE '%' || cbl.city || '%')
    )
    -- Exclude excluded areas
    AND NOT EXISTS (
      SELECT 1 FROM public.client_brief_locations excl
      WHERE excl.brief_id = p_brief_id
        AND excl.priority_tier = 'exclude'
        AND p.city ILIKE '%' || excl.city || '%'
    )
  ORDER BY
    -- must_have first, then nice_to_have
    CASE
      WHEN cbl.priority_tier = 'must_have' THEN 1
      WHEN cbl.priority_tier = 'nice_to_have' THEN 2
      ELSE 3
    END,
    cbl.priority ASC,
    p.price ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
