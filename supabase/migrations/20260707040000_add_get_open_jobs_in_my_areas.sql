-- Service Areas Plan, build step 2 (docs/SERVICE_AREAS_PLAN.md §5.2):
-- the Spotlights feed RPC. Returns ALL open inspection jobs (same shape the
-- page reads today) annotated with matches_my_areas, computed for the signed-in
-- agent by the step-1 matcher (migration 20260707030000). The UI decides what
-- to show: default = matched only; zero matches = show everything with the
-- gentle note (§4.4); "All of [Country]" / "Everywhere" pills un-hide the rest.
--
-- Deliberate choices:
-- * NOT pre-filtered — one round-trip serves the default view, the fallback,
--   and the pills without refetching.
-- * SECURITY INVOKER (like step 1): inspection_jobs RLS already lets any
--   signed-in user read open jobs (the current feed does exactly this), and
--   agent_service_areas RLS lets them read their own areas — which is all the
--   matcher needs for auth.uid(). No definer privileges required.
-- * The agent's own country is NOT returned here: the frontend already has
--   profiles.country_code in AuthContext, so the "All of [Country]" label
--   needs no extra fetch at all.
-- * bid_count is NOT included: counting other users' inspection_bids under
--   invoker RLS would silently undercount; the page already tolerates its
--   absence. Revisit alongside a bids-visibility decision, not here.
-- * ORDER: matching jobs first, newest first within each group.

CREATE OR REPLACE FUNCTION public.get_open_jobs_in_my_areas()
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  property_address TEXT,
  property_type TEXT,
  urgency_level TEXT,
  budget_amount NUMERIC,
  budget_currency TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  preferred_inspection_dates JSONB,
  scope_requirements TEXT,
  matches_my_areas BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.creator_id,
    j.property_address,
    j.property_type::TEXT,
    j.urgency_level::TEXT,
    j.budget_amount::NUMERIC,  -- column is INTEGER in the live table
    j.budget_currency,
    j.status::TEXT,
    j.created_at,
    -- to_jsonb keeps the wire shape identical whatever the column's SQL type is
    to_jsonb(j.preferred_inspection_dates) AS preferred_inspection_dates,
    j.scope_requirements,
    public.location_matches_agent_areas(
      auth.uid(),
      j.property_location,
      j.property_state,
      j.property_country,
      j.property_address
    ) AS matches_my_areas
  FROM public.inspection_jobs j
  WHERE j.status = 'open'
  ORDER BY 12 DESC, j.created_at DESC;  -- matches first, then newest
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_open_jobs_in_my_areas() TO authenticated;
