-- ============================================================================
-- GENEVA Phase 1: core tables (BAH's INTERNAL customer CRM)
-- docs/GENEVA_ROADMAP.md — v1 scope + decisions (July 5, 2026)
--
-- Geneva is SEPARATE from Monaco (the buyers-agent-facing CRM):
--   * Own fresh tables (geneva_*). Never reuses/shares Monaco tables.
--   * ACCESS MODEL IS THE OPPOSITE OF MONACO: admin-only SHARED TEAM VIEW.
--     Every policy uses public.is_admin(auth.uid()) — the app's existing
--     admin check (SECURITY DEFINER fn over profiles.role = 'admin',
--     verified live 5 Jul 2026). Do NOT use Monaco's agent_id = auth.uid().
--   * professional_type is plain TEXT + CHECK (NOT the public.user_type
--     enum): Geneva tracks PROSPECTS who need no app account. The live
--     enum has only 4 values; Geneva's list adds building_inspector and
--     stylist per Jodie's decision (tokens match the app's label maps).
--   * "Inactive requires a reason" is enforced in the APP layer, not as a
--     DB constraint (same philosophy as Monaco's next_action_date rule).
-- ============================================================================

-- ---------------------------------------------------------------- contacts
CREATE TABLE IF NOT EXISTS public.geneva_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,

  -- All six professional types per roadmap decision 4 (Jodie, July 5).
  -- Tokens verified against the app's label maps; buyers_agent default.
  professional_type TEXT NOT NULL DEFAULT 'buyers_agent'
    CHECK (professional_type IN
      ('buyers_agent', 'real_estate_agent', 'conveyancer',
       'mortgage_broker', 'building_inspector', 'stylist')),

  region_city TEXT,

  lifecycle_stage TEXT NOT NULL DEFAULT 'new'
    CHECK (lifecycle_stage IN
      ('new', 'engaged', 'qualified', 'nurturing',
       'trial_early_access', 'active_customer', 'inactive')),

  -- Required by the APP when lifecycle_stage = 'inactive' (never NOT NULL
  -- here — prospects move stages freely; the form enforces the reason).
  inactive_reason TEXT
    CHECK (inactive_reason IS NULL OR inactive_reason IN
      ('not_interested', 'wrong_professional_type', 'no_response',
       'outside_target_market', 'duplicate', 'not_ready_yet', 'other')),

  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  original_source TEXT
    CHECK (original_source IS NULL OR original_source IN
      ('linkedin', 'instagram', 'tiktok', 'youtube', 'referral', 'direct',
       'podcast', 'event', 'partner', 'manual_import', 'other')),
  source_detail TEXT,

  -- FIRM RULE (roadmap decision 3): only 'subscribed' contacts are EVER
  -- pushed to Mailchimp. Enforced again in the Phase 3 push code.
  email_consent_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_consent_status IN
      ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')),

  notes TEXT,

  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email is the dedup key. Case-insensitive so Jane@x.com = jane@x.com.
CREATE UNIQUE INDEX IF NOT EXISTS uq_geneva_contacts_email
  ON public.geneva_contacts (lower(email));

-- ------------------------------------------------------------------- notes
CREATE TABLE IF NOT EXISTS public.geneva_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.geneva_contacts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ------------------------------------------------------------------- tasks
CREATE TABLE IF NOT EXISTS public.geneva_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.geneva_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ------------------------------------------------- activities (timeline)
-- Append-only: the v1 stand-in for a full audit log (roadmap decision 5).
-- Event types (app-level, not CHECKed — mirrors Monaco's flexibility):
-- contact_created, note_added, stage_changed, task_created, task_completed,
-- source_captured, consent_changed, pushed_to_mailchimp, owner_changed.
CREATE TABLE IF NOT EXISTS public.geneva_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.geneva_contacts(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ----------------------------------------------------------------- indexes
CREATE INDEX IF NOT EXISTS idx_geneva_contacts_professional_type
  ON public.geneva_contacts(professional_type);
CREATE INDEX IF NOT EXISTS idx_geneva_contacts_lifecycle_stage
  ON public.geneva_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_geneva_contacts_owner
  ON public.geneva_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_geneva_notes_contact
  ON public.geneva_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_geneva_tasks_contact
  ON public.geneva_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_geneva_tasks_due
  ON public.geneva_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_geneva_activities_contact
  ON public.geneva_activities(contact_id, created_at DESC);

-- ------------------------------------------------------ updated_at triggers
-- Shared trigger fn public.update_updated_at_column() (verified live).
CREATE TRIGGER update_geneva_contacts_updated_at
BEFORE UPDATE ON public.geneva_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geneva_notes_updated_at
BEFORE UPDATE ON public.geneva_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geneva_tasks_updated_at
BEFORE UPDATE ON public.geneva_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------- RLS
-- ADMIN-ONLY SHARED TEAM VIEW (opposite of Monaco). Any admin sees and
-- edits ALL rows; everyone else gets nothing. public.is_admin() is
-- SECURITY DEFINER so these policies don't recurse into profiles RLS.
ALTER TABLE public.geneva_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geneva_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geneva_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geneva_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all geneva contacts"
ON public.geneva_contacts FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage all geneva notes"
ON public.geneva_notes FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage all geneva tasks"
ON public.geneva_tasks FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Activities are APPEND-ONLY: admins can read and insert; no UPDATE and no
-- DELETE policy exists, so the timeline can't be edited or trimmed from the
-- app. Rows disappear only via the ON DELETE CASCADE when a contact is
-- deleted (FK cascades are system-level and bypass RLS by design).
CREATE POLICY "Admins read geneva activities"
ON public.geneva_activities FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins append geneva activities"
ON public.geneva_activities FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));
