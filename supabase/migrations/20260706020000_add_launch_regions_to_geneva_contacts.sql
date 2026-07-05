-- ============================================================================
-- GENEVA: launch_regions on geneva_contacts (waitlist Stage 1 capture)
--
-- Controlled vocabulary — SEVEN stable tokens only, so launch-area filtering
-- stays clean ("who are the Buyers Agents in Greater Sydney?"). Friendly
-- labels live in src/lib/geneva.ts; tokens are the stored truth.
-- Multi-select, nullable (the waitlist field is optional).
--
-- The <@ (contained-by) CHECK rejects any array containing an unknown token
-- at the database level; the geneva-lead-intake edge function ALSO
-- whitelists/dedupes/caps before insert (public-endpoint discipline).
--
-- Stage 2 (flow-through to profile service areas) is deliberately NOT here —
-- deferred to the Work Regions decision (docs/WORK_REGIONS_SPEC.md).
-- ============================================================================

ALTER TABLE public.geneva_contacts
  ADD COLUMN IF NOT EXISTS launch_regions TEXT[]
    CHECK (
      launch_regions IS NULL
      OR launch_regions <@ ARRAY[
        'greater_sydney',
        'greater_melbourne',
        'seq',
        'greater_perth',
        'uk',
        'us',
        'other'
      ]::text[]
    );

COMMENT ON COLUMN public.geneva_contacts.launch_regions IS
  'Launch-region tokens the contact works in (waitlist multi-select). Controlled vocabulary — labels in src/lib/geneva.ts LAUNCH_REGION_LABELS.';
