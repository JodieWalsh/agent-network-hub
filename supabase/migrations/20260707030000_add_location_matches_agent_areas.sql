-- Service Areas Plan, build step 1 (docs/SERVICE_AREAS_PLAN.md §5.1):
-- the ONE reusable "does this location match this agent's service areas?" predicate.
-- Geography-first per the locked decisions (§4.1): real PostGIS distance for radius
-- areas, tidied first-segment/comma-tolerant text for state/country/region, global
-- matches everything.
--
-- Callers pass whatever location facts the job (or property/profile/post) has:
--   p_location  the PostGIS geography point (strongest signal; may be NULL)
--   p_state     structured state, e.g. 'New South Wales' (new jobs; NULL on legacy)
--   p_country   structured country, e.g. 'Australia'      (new jobs; NULL on legacy)
--   p_address   full address string — the legacy fallback for the text strategies
--
-- NOTE: notify_nearby_inspectors is NOT refactored onto this yet — that is a
-- deliberate follow-up so this migration stays small and reviewable.

CREATE OR REPLACE FUNCTION public.location_matches_agent_areas(
  p_agent_id UUID,
  p_location GEOGRAPHY,
  p_state TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  -- Tidy the job-side inputs once: first comma segment, trimmed, trailing
  -- "(…)" stripped — so 'Victoria, Australia' -> 'Victoria' and
  -- 'Brittany (Bretagne)' -> 'Brittany'. Empty strings become NULL.
  v_state   TEXT := NULLIF(regexp_replace(trim(split_part(COALESCE(p_state, ''), ',', 1)), '\s*\([^)]*\)$', ''), '');
  v_country TEXT := NULLIF(regexp_replace(trim(split_part(COALESCE(p_country, ''), ',', 1)), '\s*\([^)]*\)$', ''), '');
BEGIN
  RETURN
    -- ---------------------------------------------------------------
    -- Strategy 1: RADIUS — the primary, most trusted match.
    -- Real distance: the job point falls inside the area's circle.
    -- ---------------------------------------------------------------
    EXISTS (
      SELECT 1 FROM public.agent_service_areas sa
      WHERE sa.agent_id = p_agent_id
        AND sa.area_type = 'radius'
        AND p_location IS NOT NULL
        AND sa.center_point IS NOT NULL
        AND sa.radius_km IS NOT NULL
        AND ST_DWithin(sa.center_point, p_location, sa.radius_km * 1000)
    )
    OR
    -- ---------------------------------------------------------------
    -- Strategy 2: STATE — tidied text.
    -- Structured job state preferred (equality against the tidied
    -- state_name, or the state_code); legacy jobs without a structured
    -- state fall back to "tidied state_name appears in the address".
    -- state_code is never substring-matched (codes like 'WA' would
    -- match half the alphabet inside an address).
    -- ---------------------------------------------------------------
    EXISTS (
      SELECT 1 FROM public.agent_service_areas sa
      WHERE sa.agent_id = p_agent_id
        AND sa.area_type = 'state'
        AND (
          (v_state IS NOT NULL AND (
            lower(v_state) = lower(regexp_replace(trim(split_part(sa.state_name, ',', 1)), '\s*\([^)]*\)$', ''))
            OR lower(v_state) = lower(sa.state_code)
          ))
          OR
          (v_state IS NULL AND p_address IS NOT NULL AND sa.state_name IS NOT NULL
            AND p_address ILIKE '%' || regexp_replace(trim(split_part(sa.state_name, ',', 1)), '\s*\([^)]*\)$', '') || '%')
        )
    )
    OR
    -- ---------------------------------------------------------------
    -- Strategy 3: COUNTRY — tidied text, same shape as STATE.
    -- ---------------------------------------------------------------
    EXISTS (
      SELECT 1 FROM public.agent_service_areas sa
      WHERE sa.agent_id = p_agent_id
        AND sa.area_type = 'country'
        AND (
          (v_country IS NOT NULL AND (
            lower(v_country) = lower(regexp_replace(trim(split_part(sa.country_name, ',', 1)), '\s*\([^)]*\)$', ''))
            OR lower(v_country) = lower(sa.country_code)
          ))
          OR
          (v_country IS NULL AND p_address IS NOT NULL AND sa.country_name IS NOT NULL
            AND p_address ILIKE '%' || regexp_replace(trim(split_part(sa.country_name, ',', 1)), '\s*\([^)]*\)$', '') || '%')
        )
    )
    OR
    -- ---------------------------------------------------------------
    -- Strategy 4: REGION — tidied first segment of region_name inside
    -- the address. region_name is a full Mapbox string ('Melbourne,
    -- Victoria, Australia') while addresses render without those commas,
    -- so only the first segment ('Melbourne') can ever match — this is
    -- the §3.1 fix for the previously-broken region strategy.
    -- ---------------------------------------------------------------
    EXISTS (
      SELECT 1 FROM public.agent_service_areas sa
      WHERE sa.agent_id = p_agent_id
        AND sa.area_type = 'region'
        AND sa.region_name IS NOT NULL
        AND p_address IS NOT NULL
        AND p_address ILIKE '%' || regexp_replace(trim(split_part(sa.region_name, ',', 1)), '\s*\([^)]*\)$', '') || '%'
    )
    OR
    -- ---------------------------------------------------------------
    -- Strategy 5: GLOBAL — the agent serves everywhere.
    -- ---------------------------------------------------------------
    EXISTS (
      SELECT 1 FROM public.agent_service_areas sa
      WHERE sa.agent_id = p_agent_id
        AND sa.area_type = 'global'
    );
END;
$$;

-- Callers: the feed RPC (step 2) runs as SECURITY DEFINER and sees all rows;
-- direct calls by a signed-in user are subject to agent_service_areas RLS,
-- which is exactly right for "match against MY areas".
GRANT EXECUTE ON FUNCTION public.location_matches_agent_areas(UUID, GEOGRAPHY, TEXT, TEXT, TEXT) TO authenticated;
