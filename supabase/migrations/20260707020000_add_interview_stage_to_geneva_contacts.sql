-- ============================================================================
-- GENEVA: interview_stage — the Interview Funnel pipeline (piece 3).
--
-- ONLY meaningful for contact_type = 'interview_outreach' (the treasured,
-- one-at-a-time buyers agents we proactively reach out to). Waitlist
-- contacts stay NULL forever and keep using lifecycle_stage — the two
-- populations never share a stage vocabulary, which also keeps the
-- dashboard's waitlist funnel metrics clean (piece 4).
--
-- The 7-step journey + side exits (docs/GENEVA_ROADMAP.md vision):
--   to_contact → intro_email_sent → call_made → interview_booked →
--   questions_sent → reminder_sent → interviewed → thanked → clips_sent
--   exits: declined | declined_kept_on_list
-- NOTE: declined_kept_on_list means "no to the interview, ok to mailing
-- list" — the consent-evidence wall (piece 2) STILL applies before any
-- Mailchimp push.
--
-- App-level rule (not a DB constraint, per project convention): the form
-- starts interview_outreach contacts at 'to_contact'.
-- interview_stage_entered_at powers days-in-stage (same pattern as
-- Monaco's stage_entered_at).
-- ============================================================================

ALTER TABLE public.geneva_contacts
  ADD COLUMN IF NOT EXISTS interview_stage TEXT
    CHECK (interview_stage IS NULL OR interview_stage IN
      ('to_contact', 'intro_email_sent', 'call_made', 'interview_booked',
       'questions_sent', 'reminder_sent', 'interviewed', 'thanked',
       'clips_sent', 'declined', 'declined_kept_on_list')),
  ADD COLUMN IF NOT EXISTS interview_stage_entered_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.geneva_contacts.interview_stage IS
  'Interview Funnel stage — interview_outreach contacts only; NULL for waitlist. Labels in src/lib/geneva.ts INTERVIEW_STAGE_LABELS.';
