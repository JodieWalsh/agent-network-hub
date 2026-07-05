-- ============================================================================
-- GENEVA: contact_type — waitlist vs interview-outreach (Interview Funnel,
-- piece 1: the label). docs/GENEVA_ROADMAP.md.
--
-- Two populations with DIFFERENT compliance rules:
--   'waitlist'           — they came to US (landing form / manual add).
--                          Consent captured at signup; may be Mailchimp-
--                          pushed once subscribed.
--   'interview_outreach' — WE reached out to THEM. NOT opted in. Must NEVER
--                          be treated as subscribed or pushed to Mailchimp
--                          without explicit, recorded consent (AU Spam Act).
--
-- NOT NULL DEFAULT 'waitlist' backfills all existing rows (incl. the 24
-- demo contacts) as 'waitlist' in this same statement — no data script.
-- The public geneva-lead-intake function does not send this field, so every
-- form signup lands as 'waitlist' by default; outreach contacts can only be
-- created deliberately by an admin.
--
-- Enforcement layers (this column enables; later pieces wire in):
--   1. geneva-lead-intake forces 'waitlist' server-side (next piece)
--   2. geneva-mailchimp-push refuses interview_outreach without explicitly
--      recorded consent (next piece) — on top of the existing
--      subscribed-only rule
-- ============================================================================

ALTER TABLE public.geneva_contacts
  ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'waitlist'
    CHECK (contact_type IN ('waitlist', 'interview_outreach'));

COMMENT ON COLUMN public.geneva_contacts.contact_type IS
  'waitlist = opted in themselves (Mailchimp-eligible once subscribed); interview_outreach = we contacted them, NEVER push without explicit recorded consent (AU Spam Act).';
