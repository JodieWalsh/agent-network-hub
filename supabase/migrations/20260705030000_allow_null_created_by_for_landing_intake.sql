-- ============================================================================
-- GENEVA: allow NULL created_by on geneva_contacts (landing-page intake)
--
-- Piece 1 of the Landing-Page Lead Capture phase (docs/GENEVA_ROADMAP.md).
-- Public visitors have no auth user, so the geneva-lead-intake edge function
-- inserts contacts with created_by = NULL. NULL means "created by the
-- landing-page intake" — the record page renders a null actor/creator as
-- "Landing page". Admin-created contacts continue to set created_by.
--
-- RLS is deliberately NOT touched: geneva_* stays admin-only; the intake
-- writes via the service role inside the edge function, exactly like the
-- Stripe webhook does. anon still has zero access to every geneva_* table.
-- ============================================================================

ALTER TABLE public.geneva_contacts
  ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN public.geneva_contacts.created_by IS
  'Admin who created the contact; NULL = created by the public landing-page intake (geneva-lead-intake edge function).';
