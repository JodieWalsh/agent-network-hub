-- ============================================================================
-- CRM Phase 1: Core tables (clients, client_members, client_tasks,
-- client_notes, client_activities)
--
-- Plan: docs/CRM_ROADMAP.md | Spec: docs/CRM_DESIGN_SPEC.docx
-- Decisions honoured:
--   * Owner field is agent_id (uuid) on EVERY table — matches client_briefs.
--   * Two-layer stage design: lifecycle_stage + buying_stage (TEXT + CHECK,
--     consistent with how client_briefs.status is done).
--   * next_action_date is NULLABLE — "required for live clients" is an
--     app-level validation rule, never a DB constraint (roadmap risk #4).
--   * RLS mirrors client_briefs owner policies (auth.uid() = agent_id),
--     EXCEPT the open "view all" policy — deliberately omitted, see note
--     above the policies section. CRM rows contain client PII.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. clients — the household / buying-group master record
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  household_name TEXT NOT NULL,
  household_type TEXT CHECK (household_type IN
    ('couple', 'family', 'parent_child', 'co_buyers', 'single', 'other'))
    DEFAULT 'other',

  -- FK added AFTER client_members exists (circular reference), see ALTER below
  primary_contact_member_id UUID,

  -- Layer 1: relationship status (prospect -> outcome)
  lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN
    ('new_enquiry', 'discovery_booked', 'discovery_completed',
     'engaged', 'closed_won', 'closed_lost'))
    DEFAULT 'new_enquiry',

  -- Layer 2: buying process AFTER engagement (null until signed)
  buying_stage TEXT CHECK (buying_stage IN
    ('brief_confirmed', 'search_active', 'inspecting', 'shortlist_formed',
     'due_diligence', 'offer_submitted', 'negotiation', 'under_contract',
     'settlement_support')),

  -- Operational status, separate from lifecycle (supports pause/reactivate
  -- without losing lifecycle position)
  client_status TEXT NOT NULL CHECK (client_status IN
    ('active', 'paused', 'lost', 'won', 'archived'))
    DEFAULT 'active',

  lead_source TEXT,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),

  -- Follow-up discipline fields (drive dashboard widgets).
  -- next_action_date is intentionally NULLABLE: enforced by app validation
  -- for live clients only (closed/prospect records may have none).
  next_action_date DATE,
  next_action_type TEXT,
  last_contact_at TIMESTAMP WITH TIME ZONE,

  -- Shared household budget + search summary
  shared_budget_min NUMERIC,
  shared_budget_max NUMERIC,
  target_locations_summary TEXT,

  -- Stage bookkeeping
  stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  buying_stage_entered_at TIMESTAMP WITH TIME ZONE,

  -- Closed-state reason capture (spec: closed states require reasons)
  paused_reason TEXT,
  lost_reason TEXT,
  won_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. client_members — individual people within a household
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  role_in_household TEXT CHECK (role_in_household IN
    ('spouse', 'partner', 'parent', 'child', 'co_buyer', 'other'))
    DEFAULT 'other',
  is_decision_maker BOOLEAN NOT NULL DEFAULT false,
  is_financial_decision_maker BOOLEAN NOT NULL DEFAULT false,
  communication_preference TEXT,
  notes TEXT,
  last_contact_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Now that client_members exists, wire the circular FK from clients.
ALTER TABLE public.clients
  ADD CONSTRAINT clients_primary_contact_member_fk
  FOREIGN KEY (primary_contact_member_id)
  REFERENCES public.client_members(id) ON DELETE SET NULL;

-- Integrity: at most ONE primary contact per household at the DB level.
-- (The "exactly one" rule and auto-unset of a previous primary are app-level
-- behaviours per the spec; this index just makes duplicates impossible.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_members_one_primary
  ON public.client_members (client_id)
  WHERE is_primary_contact;

-- ----------------------------------------------------------------------------
-- 3. client_tasks — ONE task model, two visibility levels
--    client_member_id NULL  -> shared household task
--    client_member_id set   -> person-specific task
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_member_id UUID REFERENCES public.client_members(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN
    ('call', 'email', 'meeting', 'follow_up', 'finance_check', 'brief_update',
     'inspection', 'due_diligence', 'offer', 'contract', 'settlement',
     'document_chase', 'internal_reminder'))
    DEFAULT 'follow_up',
  status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'cancelled'))
    DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
    DEFAULT 'medium',

  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  snoozed_until TIMESTAMP WITH TIME ZONE,

  -- Cross-module links (Phase 2/3 will use these; nullable from day one)
  related_brief_id UUID REFERENCES public.client_briefs(id) ON DELETE SET NULL,
  related_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  related_inspection_id UUID REFERENCES public.inspection_jobs(id) ON DELETE SET NULL,

  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. client_notes — freeform notes, pinnable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_member_id UUID REFERENCES public.client_members(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. client_activities — the timeline (append-only event log)
--    event_type is deliberately FREE TEXT (no CHECK): the set of timeline
--    event types grows with every later phase (brief/property/inspection
--    events, then email, calendar, AI events). event_context carries the
--    per-event payload (e.g. old/new stage, note excerpt, property id).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  event_type TEXT NOT NULL,
  event_context JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- Row Level Security
--
-- Mirrors the client_briefs owner policies (auth.uid() = agent_id) for
-- SELECT / INSERT / UPDATE / DELETE.
--
-- DELIBERATE DEVIATION: client_briefs also has an open policy
-- ("Authenticated users can view all briefs" USING (true)). That policy is
-- NOT replicated here. CRM rows hold client PII (names, emails, phones,
-- budgets, private notes) — no agent should ever see another agent's
-- clients. Owner-only access on every table.
-- ============================================================================

ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

-- clients
CREATE POLICY "Agents can view their own clients"
ON public.clients FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own clients"
ON public.clients FOR UPDATE TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own clients"
ON public.clients FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- client_members
CREATE POLICY "Agents can view their own client members"
ON public.client_members FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create client members"
ON public.client_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own client members"
ON public.client_members FOR UPDATE TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own client members"
ON public.client_members FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- client_tasks
CREATE POLICY "Agents can view their own client tasks"
ON public.client_tasks FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create client tasks"
ON public.client_tasks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own client tasks"
ON public.client_tasks FOR UPDATE TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own client tasks"
ON public.client_tasks FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- client_notes
CREATE POLICY "Agents can view their own client notes"
ON public.client_notes FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create client notes"
ON public.client_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own client notes"
ON public.client_notes FOR UPDATE TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own client notes"
ON public.client_notes FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- client_activities (timeline is append-only: no UPDATE policy; DELETE
-- allowed to the owner for cleanup, but the app should never offer it)
CREATE POLICY "Agents can view their own client activities"
ON public.client_activities FOR SELECT TO authenticated
USING (auth.uid() = agent_id);

CREATE POLICY "Agents can create client activities"
ON public.client_activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own client activities"
ON public.client_activities FOR DELETE TO authenticated
USING (auth.uid() = agent_id);

-- ============================================================================
-- Indexes
-- ============================================================================

-- clients: dashboard + list-view queries
CREATE INDEX IF NOT EXISTS idx_clients_agent            ON public.clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle_stage  ON public.clients(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_clients_buying_stage     ON public.clients(buying_stage);
CREATE INDEX IF NOT EXISTS idx_clients_next_action_date ON public.clients(next_action_date);
CREATE INDEX IF NOT EXISTS idx_clients_status           ON public.clients(client_status);

-- client_members
CREATE INDEX IF NOT EXISTS idx_client_members_client ON public.client_members(client_id);
CREATE INDEX IF NOT EXISTS idx_client_members_agent  ON public.client_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_members_email  ON public.client_members(email);

-- client_tasks: "tasks due today" widget + per-client task lists
CREATE INDEX IF NOT EXISTS idx_client_tasks_client ON public.client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_agent  ON public.client_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_due    ON public.client_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_client_tasks_status ON public.client_tasks(status);

-- client_notes
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_agent  ON public.client_notes(agent_id);

-- client_activities: timeline is always fetched per-client, newest first
CREATE INDEX IF NOT EXISTS idx_client_activities_client  ON public.client_activities(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_activities_agent   ON public.client_activities(agent_id);

-- ============================================================================
-- updated_at triggers (reuses the existing helper from client_briefs et al.)
-- ============================================================================

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_members_updated_at
BEFORE UPDATE ON public.client_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_tasks_updated_at
BEFORE UPDATE ON public.client_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
