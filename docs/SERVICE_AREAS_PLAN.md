# Service Areas — Matching Plan (Jobs Page First)

**Date:** July 7, 2026
**Status:** Planning — investigated against the LIVE database (not types.ts). No code built yet.
**First slice:** filter the Inspection Spotlights jobs feed to the signed-in agent's service areas.

---

## 1. What the live database actually holds

### `agent_service_areas` (verified live — 15 rows currently)

| Column | Type / shape | Notes |
|---|---|---|
| `id` | uuid | |
| `agent_id` | uuid | FK to profiles |
| `area_type` | text | `radius` \| `region` \| `state` \| `country` \| `global` |
| `center_point` | PostGIS geography(Point) | radius areas only; GeoJSON `coordinates: [lng, lat]` when read via REST |
| `center_name` | text | radius areas only, e.g. "Bendigo, Victoria, Australia" |
| `radius_km` | numeric | radius areas only (live samples: 205km, 235km) |
| `region_id` | uuid | null in live data |
| `region_name` | text | **full Mapbox place string**, e.g. "Melbourne, Victoria, Australia" |
| `state_code` / `state_name` | text | e.g. "New South Wales", but also non-AU: "Marlborough", "Brittany (Bretagne)", "Corsica (Corse)" |
| `country_code` / `country_name` | text | e.g. "Zimbabwe" |
| `is_primary` | boolean | |
| `priority` | integer | |
| `created_at` / `updated_at` | timestamptz | |

Live distribution: 5 radius, 6 state, 3 country, 1 region, 0 global.
Radius rows are inserted via the `insert_radius_service_area` RPC (builds the geography point from `p_lat`/`p_lng`); other types via plain inserts from `ServiceAreaManager.tsx`.

### `inspection_jobs` — location columns (verified live — 9 rows, 1 open)

| Column | Live reality |
|---|---|
| `property_address` | **The only populated text field.** Full Mapbox string, e.g. "52b Beaconsfield Road, Chatswood New South Wales 2067, Australia". General-area jobs are prefixed `"Area: "` (3 of 9 jobs). |
| `property_location` | PostGIS geography(Point). **Populated on 8 of 9 jobs** — including general-area jobs (centroid of the chosen area). Arrives as hex WKB via REST, so the frontend cannot read coordinates from it directly. |
| `property_city`, `property_state`, `property_country`, `property_postcode` | **Exist but are populated on 0 of 9 jobs.** `CreateInspectionJob.tsx` never writes them. |
| `property_lat`, `property_lng` | **Exist but populated on 0 of 9 jobs.** The form holds lat/lng in state, builds the `POINT(lng lat)` string for `property_location`, and discards the raw numbers. |

The Spotlights feed (`InspectionSpotlights.tsx:124`) fetches `select=*&status=eq.open` and filters client-side by address substring only.

---

## 2. Prior art we can build on

`notify_nearby_inspectors(p_job_id)` (migration `20260128040000`) already matches **one job → many agents** with six strategies:

1. **radius:** `ST_DWithin(sa.center_point, job.property_location, sa.radius_km * 1000)`
2. **global:** matches everything
3. **region:** `job.property_address ILIKE '%' || sa.region_name || '%'`
4. **state:** `job.property_address ILIKE '%' || sa.state_name || '%'`
5. **country:** `job.property_address ILIKE '%' || sa.country_name || '%'`
6. **home proximity:** profile lat/lng within 5km of the job

The jobs-page filter is the same predicate **inverted** (one agent → many jobs). The matching core should be extracted into ONE SQL function both callers share.

---

## 3. Honest matching assessment

**What works well:**
- **radius × `property_location`** — the strongest signal. Real geometry on both sides, `ST_DWithin` is exact and indexed-friendly. Covers 8/9 live jobs and 5/15 live areas.
- **state / country ILIKE against the address** — Mapbox writes the state and country into every address string ("…Chatswood **New South Wales** 2067, **Australia**"), so these substring checks fire reliably.
- **global** — trivially correct.

**What is hard or ambiguous (must be acknowledged in the build):**
1. **Region matching is largely broken today.** `region_name` is stored as a comma-separated Mapbox string ("Melbourne, Victoria, Australia") but job addresses render *without* those commas ("… Melbourne Victoria 3000, Australia"), so `ILIKE '%Melbourne, Victoria, Australia%'` almost never matches. Fix: match on the *first segment* only (`split_part(region_name, ',', 1)` → "Melbourne"), accepting some false positives.
2. **Substring false positives are real:** a street named "Zimbabwe Road" would match a Zimbabwe country area; "Marlborough" (NZ region) matches "Marlborough Street" anywhere. Tolerable for a default *filter* (worst case: an extra job shows), riskier for alerts.
3. **No structured columns to lean on:** `property_city/state/postcode/lat/lng` are all-null, so nothing better than address-substring exists for text matching **unless we start populating them at job creation** (cheap: the form already holds lat/lng — recommended fix-forward, needs approval since it touches `CreateInspectionJob.tsx`).
4. **The 1-in-9 job with NULL `property_location`** can never radius-match — text strategies are its only hope. The filter must treat "no location" as unmatched, and the zero-results fallback protects agents from an empty feed.
5. **Frontend can't do the matching.** `property_location` is hex WKB over REST and lat/lng columns are empty, so distance math in the browser is impossible today. **Matching must live in SQL (RPC)** — which is also what makes it reusable.
6. **Cross-currency of place names:** non-AU states like "Brittany (Bretagne)" contain parentheses; ILIKE handles them literally, but the "(Bretagne)" part will never appear in an address. First-segment matching helps here too ("Brittany").

---

## 4. Design decisions — FINAL (locked July 7, 2026)

1. **Matching approach = accurate geography-first** (NOT the rough first-word-only match):
   - **Radius areas → real distance.** The job's `property_location` point must fall within the area's `center_point` + `radius_km` — actual PostGIS distance (`ST_DWithin`) computed in SQL. This is the primary, most trusted strategy.
   - **State / country areas (no radius) → tidied text.** Compare the job's state against `state_name`/`state_code` and country against `country_name`/`country_code`, using the first-segment / comma-tolerant normalisation from §3.1 so the comparison actually fires against Mapbox-formatted strings. (New jobs carry structured `property_state`/`property_country` per decision 6, so those columns are the primary comparison source; **legacy jobs** with empty columns fall back to the address-string comparison.)
   - **Region areas → same tidied-text approach** (first segment of `region_name`, comma-tolerant).
2. **"All of [Country]" shows all OPEN jobs in the agent's OWN country** — not all countries. The label adapts per the profile country: "All of Australia" / "All of the US" / "All of the UK" (definite article for US/UK).
3. **Default = my areas.** The Spotlights jobs feed is filtered to the signed-in agent's service areas by default.
4. **Gentle zero fallback.** If the filter yields ZERO jobs, show everything with a quiet note (e.g. "No jobs in your service areas yet — showing all open jobs").
5. **Build the matcher once.** The "does this thing match my areas?" predicate is written as one reusable SQL function so marketplace properties, directory profiles, forum regional boards, and job alerts can reuse it later without re-deriving the rules.
6. **Jobs must carry structured location (NEW — locked July 7, 2026).** Every inspection job MUST have a **state** and a **country** — these become required fields, no longer left empty. At job creation the **country defaults to the poster's own country** (from `profiles.country_code`) so they don't re-enter it each time, but it remains editable. Structured job location (at least `property_state` + `property_country`, plus `property_lat`/`property_lng` where available) is saved on every new job — reliable state/country matching depends on jobs actually having them. This makes the former "fix-forward" a **required part of this slice**, not an optional extra.

---

## 5. Proposed build order (jobs-page-first slice)

1. **Migration — extract the shared matcher (geography-first).**
   `location_matches_agent_areas(p_agent_id uuid, p_location geography, p_address text) RETURNS boolean` — evaluates **distance first** (`ST_DWithin` on radius areas against `property_location`), then the tidied-text strategies for state/country/region per §4.1, plus global. Refactor `notify_nearby_inspectors` to call it (behaviour-preserving apart from the region fix), so there is exactly one source of truth.
2. **Migration — feed RPC.**
   `get_open_jobs_in_my_areas()` (SECURITY DEFINER, `auth.uid()`) returning open jobs annotated with `matches_my_areas boolean` — one round-trip gives the frontend both the filtered view and the fallback set.
3. **`CreateInspectionJob.tsx` — structured location becomes required (decision §4.6).**
   State + country are required on every new job; country pre-fills from the poster's `profiles.country_code` (editable). Save `property_state`, `property_country`, and `property_lat`/`property_lng` (plus `property_city`/`property_postcode` when Mapbox provides them) alongside the existing `property_location` point. Works for both exact-address and "Area:" general-area jobs (Mapbox returns state/country context for both).
4. **Frontend — `InspectionSpotlights.tsx`.**
   Replace the raw `select=*` fetch with the RPC; default to matched jobs; zero-match fallback note; filter pills: "My areas" (default) / "All of {Country}" (from `profiles.country_code`: AU→Australia, US→the US, GB→the UK, else country name) / "Everywhere".
5. **Verify** with the verify-accessibility routine (375px, proven 24px root, screenshot) plus a data check that the seeded agent's areas produce the expected matched/unmatched split, and that a newly created job lands with state/country/lat/lng populated.
6. **Later slices** (separate efforts): marketplace properties, directory "serves your area" badges, forum board suggestions, job alert emails — all calling the §5.1 function.

---

## 6. Open questions — RESOLVED (July 7, 2026)

1. ~~Approve the region first-segment fix (§3.1)?~~ **RESOLVED:** yes — but as part of the **geography-first** approach (§4.1): radius areas match by real PostGIS distance; the tidied first-segment/comma-tolerant text comparison applies to state, country, and region areas.
2. ~~Approve the fix-forward on `CreateInspectionJob.tsx` as part of this slice, or defer?~~ **RESOLVED — INCLUDED (July 7, 2026):** structured job location is now REQUIRED (decision §4.6). Every new job must carry state + country (country defaulting from the poster's profile, editable), and lat/lng where available — it is build-order step §5.3, not an optional extra. Legacy jobs keep working via the address-string fallback in the matcher.
3. ~~Should "All of [Country]" filter by the job's country or un-filter to everything?~~ **RESOLVED:** it shows all OPEN jobs in the agent's **own** country (label adapts: All of Australia / the US / the UK).
