-- ============================================================================
-- CRM Phase 3, properties step 1: client_properties join table.
--
-- A brand-new CRM-OWNED table linking a household (clients) to a marketplace
-- property (properties) with a pipeline status. Deliberately a JOIN TABLE,
-- not a column on properties: a property is a shared marketplace object the
-- agent usually does not own, and one property can be a candidate for many
-- households. The existing properties table is NOT touched in any way.
--
-- Plan: docs/CRM_ROADMAP.md (Phase 3). Conventions honoured:
--   * agent_id owner field on the table (CRM convention, decision 1).
--   * Owner-only RLS mirroring the Phase 1 CRM tables exactly —
--     auth.uid() = agent_id, NO "authenticated users can view all" policy
--     (CRM rows reveal which properties a client is pursuing — PII-adjacent).
--   * status_entered_at bookkeeping matches clients.stage_entered_at.
--   * updated_at trigger reuses the shared update_updated_at_column().
--
-- Status pipeline (roadmap: candidate → shortlisted → due diligence →
-- offer → purchased/lost):
--   candidate → shortlisted → due_diligence → offered → purchased | passed
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN
    ('candidate', 'shortlisted', 'due_diligence', 'offered', 'purchased', 'passed'))
    DEFAULT 'candidate',

  -- When the current status began — drives "days in status", same pattern
  -- as clients.stage_entered_at.
  status_entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Optional: why this property suits (or no longer suits) this household.
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- The same property can only be linked once per household.
  CONSTRAINT uq_client_properties_client_property UNIQUE (client_id, property_id)
);

-- ============================================================================
-- Row Level Security — owner-only, mirroring the Phase 1 CRM tables exactly.
-- ============================================================================

ALTER TABLE public.client_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own client properties"
ON public.client_properties FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create client properties"
ON public.client_properties FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own client properties"
ON public.client_properties FOR UPDATE TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own client properties"
ON public.client_properties FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_properties_client   ON public.client_properties(client_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_property ON public.client_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_agent    ON public.client_properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_properties_status   ON public.client_properties(status);

-- ============================================================================
-- updated_at trigger (same helper as every other CRM table)
-- ============================================================================

CREATE TRIGGER update_client_properties_updated_at
BEFORE UPDATE ON public.client_properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
