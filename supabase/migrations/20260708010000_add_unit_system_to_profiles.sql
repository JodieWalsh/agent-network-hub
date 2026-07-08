-- Units-preference persistence, step 1 (plan agreed July 8, 2026):
-- add profiles.unit_system so the Metric/Imperial preference follows the
-- account across devices instead of living only in localStorage.
--
-- Deliberately NULLABLE with NO default:
--   NULL      = the user has never chosen -> the app applies the
--               country-aware default (getDefaultUnitSystem, e.g. US -> imperial)
--               and/or migrates up an existing localStorage value.
--   non-NULL  = an explicit choice (from the sidebar toggle or the
--               ProfileEdit radio) -> always wins, on every device.
-- A DB default of 'metric' would make every existing row look like an
-- explicit metric choice and permanently defeat the US-imperial default.

ALTER TABLE public.profiles
  ADD COLUMN unit_system TEXT
  CONSTRAINT profiles_unit_system_check CHECK (unit_system IN ('metric', 'imperial'));
