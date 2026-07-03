-- ============================================================================
-- CRM Phase 2, step 1: allow a brief to link to a CRM household.
--
-- Adds ONE nullable column to the existing client_briefs table:
--   client_id UUID -> clients(id), ON DELETE SET NULL
--
-- Plan: docs/CRM_ROADMAP.md (decision 4, verified live 3 Jul + 4 Jul 2026:
-- client_briefs has no client_id column; types.ts is stale and not trusted).
--
-- Deliberately minimal and non-destructive:
--   * NULLABLE, no default — every existing brief stays exactly as it is,
--     unlinked, until explicitly linked from the UI in a later step.
--   * ON DELETE SET NULL — deleting a household simply unlinks its briefs;
--     it can never delete or break a brief.
--   * No existing column, constraint, policy, or row is touched.
--   * Existing briefs RLS already covers the new column (policies are
--     row-level on agent_id; no new policy needed).
-- ============================================================================

ALTER TABLE public.client_briefs
  ADD COLUMN IF NOT EXISTS client_id UUID
  REFERENCES public.clients(id) ON DELETE SET NULL;

-- Lookups are always "briefs for this household"; almost all rows will have
-- client_id NULL, so index only the linked ones.
CREATE INDEX IF NOT EXISTS idx_client_briefs_client_id
  ON public.client_briefs(client_id)
  WHERE client_id IS NOT NULL;
