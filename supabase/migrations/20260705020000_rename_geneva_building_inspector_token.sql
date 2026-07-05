-- ============================================================================
-- GENEVA: rename professional_type token
--   'building_inspector' → 'building_and_pest_inspector'
--
-- Dani decision (July 5, 2026): in Australia building + pest inspection go
-- together as one service, so Geneva's type reads "Building and Pest
-- Inspector". Renamed the TOKEN (not just the label) while geneva_contacts
-- is empty (verified 0 rows before applying) — free now, costly later.
-- Note: this is Geneva's own TEXT+CHECK column, independent of the
-- platform's public.user_type enum (which doesn't contain
-- building_inspector at all — it's UI-label-only there).
--
-- Safety: no data rewrite needed (0 rows). Default stays 'buyers_agent'.
-- ============================================================================

ALTER TABLE public.geneva_contacts
  DROP CONSTRAINT geneva_contacts_professional_type_check;

ALTER TABLE public.geneva_contacts
  ADD CONSTRAINT geneva_contacts_professional_type_check
  CHECK (professional_type IN
    ('buyers_agent', 'real_estate_agent', 'conveyancer',
     'mortgage_broker', 'building_and_pest_inspector', 'stylist'));
