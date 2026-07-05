-- ============================================================================
-- GENEVA Phase 3: Mailchimp sync-status fields on geneva_contacts
--
-- Set ONLY by the geneva-mailchimp-push edge function (service role) after a
-- successful/failed push. NULL = never pushed. The record page shows this
-- discreetly near the consent indicator.
--
-- Firm rule lives in the edge function: only email_consent_status =
-- 'subscribed' contacts are EVER pushed (re-verified server-side).
-- RLS untouched — columns inherit geneva_contacts' admin-only policies.
-- ============================================================================

ALTER TABLE public.geneva_contacts
  ADD COLUMN IF NOT EXISTS mailchimp_status TEXT
    CHECK (mailchimp_status IS NULL OR mailchimp_status IN ('synced', 'error')),
  ADD COLUMN IF NOT EXISTS mailchimp_synced_at TIMESTAMP WITH TIME ZONE;
