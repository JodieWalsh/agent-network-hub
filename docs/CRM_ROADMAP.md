# CRM Roadmap — Buyers Agent Hub

**Created:** July 3, 2026
**Status:** Planning complete — awaiting go-ahead to build Phase 1 database.
**Source spec:** `docs/CRM_DESIGN_SPEC.docx` (~6,000 words — full multi-phase vision).
**Design system:** Quiet Luxury (see `CLAUDE.md` → DESIGN VISION).

> ⚠️ **This is a plan, not built code.** No CRM tables or CRM UI exist yet. Do not treat any table/field name below as existing in the database until Phase 1 is actually implemented.

---

## Product intent (one paragraph)

A calm, premium *operating system* for a boutique buyers-agent business — **not** an enterprise sales funnel. The guiding question is *"what needs attention next?"*, not *"how many leads are in the funnel?"* The primary record is a **household ("Client")**, not an individual person (e.g. "Smith Household" with members Sarah & James). It manages **both prospects and signed clients** in one continuous system and must feel native to the existing app, deeply linked to Briefs / Properties / Inspections rather than bolted on.

---

## Decisions locked in (July 3, 2026)

1. **Owner field = `agent_id`** across all CRM tables. We follow the existing Client Briefs convention, **not** the spec's `assigned_user_id`. This keeps RLS and joins consistent with `client_briefs` (which uses `agent_id`).
2. **Permissions:** the CRM **reuses the existing `CAN_MANAGE_CLIENT_BRIEFS`** permission. No new permission is created.
3. **Brief ↔ household name rule (for Phase 2):** once a brief is linked to a household, **`clients.household_name` is the source of truth**; the old `client_briefs.client_name` free-text field defers to it. (Recorded now — no code today.)
4. **Schema verified against live DB (read-only):** `client_briefs` currently has **no `client_id` column** (confirmed 3 Jul 2026 via PostgREST OpenAPI introspection — `types.ts` is stale and was not trusted). Phase 2 will need to add a nullable `client_id` FK to `client_briefs`, or use a join table.
5. **Subscription gating (NEEDS DANI APPROVAL — see below):** the CRM must be designed so a subscription/tier access check can be added later at **one clean gate point**. Which tiers get access is **not** hard-coded yet.

---

## Phased plan

### Phase 1 — Data model + core record experience *(build first)*
- Tables: `clients` (household master), `client_members`, `client_tasks`, `client_notes` and/or `client_activities` (timeline).
- **Two separate stage layers** (never one overloaded field):
  - **Lifecycle stage** (relationship): New enquiry → Discovery booked → Discovery completed → Engaged / signed → Closed won → Closed lost / paused.
  - **Buying stage** (service delivery, after engagement): Brief confirmed → Search active → Inspecting → Shortlist formed → Due diligence → Offer submitted → Negotiation → Under contract → Settlement support.
- One task model with two visibility levels: `client_member_id` null = shared household task; set = person-specific. Filters: Shared / Member / All.
- **Clients list view** (default — sortable/filterable table).
- **Board (Kanban) view** — secondary; group by lifecycle **or** buying stage, never both at once.
- **Client record** with tabs: Overview, Members, Tasks, Timeline (Brief / Properties / Inspections tabs come in later phases).
- `agent_id` on every table (decision 1); RLS filtered by `agent_id` like briefs.

### Phase 2 — Brief + dashboard integration
- Link Clients ↔ existing `client_briefs` (add nullable `client_id` FK per decision 4).
- Surface brief summary (status, budget, locations, type, must-haves, last updated) inside the Client record.
- Apply the household-name source-of-truth rule (decision 3).
- Add CRM widgets to the main dashboard: **Clients needing attention**, **Tasks due today**, Active households, Active briefs, Live offers/negotiations, Upcoming inspections/meetings — placed high but keeping the dashboard balanced across the whole app.
- Dashboard quick actions: New Client, New Brief, Log Note, Create Task.

### Phase 3 — Property + inspection integration
- Link `properties` to clients (`ClientProperty` join: candidate → shortlisted → due diligence → offer → purchased/lost). Property actions write timeline entries.
- Link inspection jobs/reports to clients. Note: `inspection_jobs` **already** has a `client_brief_id` FK, so household ↔ inspection can flow via the brief or directly — decide at build time to avoid double-linking.
- Surface operational status across those modules in the Client record.

### Phase 4 — Workflow refinement
- Saved views (All active, Prospects, Discovery pipeline, Signed, Buying in progress, Offers live, Needs attention, No next action, Paused/lost).
- Lightweight automations & smart defaults (e.g. brief complete → suggest "Brief confirmed"; offer logged → suggest "Offer submitted"; settlement → suggest "Closed won"; require reason on pause/lost).
- Stage-age alerts and "needs attention" flags (no next action, overdue tasks, stale contact).

### Later phases — Communications & AI *(long-horizon vision from spec)*
- **Email integration** (Google Workspace / Microsoft 365): *selective* logging only — never sync-everything; match to members by verified email, roll up to household, strict privacy/exclusion rules.
- **Calendar sync** (Google / Outlook): prioritised first among comms (cleaner signal); one-way ingest of client-facing meetings; feeds Discovery-booked stage accuracy.
- **Unified communications timeline**: email, calendar, notes, calls, tasks, stage changes, properties, inspections, offers all in one thread.
- **AI summary layer**: restrained, grounded-in-real-data household summary (status / recent changes / next priority) — never invents facts; "View sources"; freshness timestamp.
- **AI next-best-action**: advisory only, one-click convert to a real task, with plain-language reasoning.

---

## 🔴 NEEDS DANI APPROVAL

**CRM subscription-tier gating.** The CRM is intended to be a **paid** feature (free users excluded, paying subscribers included). This is a pricing/product decision, so **which tiers get access is NOT hard-coded**. Recorded as item **#23** in `docs/DANI_APPROVAL_CHECKLIST.md`. Open questions: paid-only? Premium-only vs Basic+Premium? per-tier usage limits? free preview/trial? require *active* status vs tier label alone?

### How subscription tier is tracked today (where the future gate hooks in)
- A user's plan lives on the **`profiles`** table as **`subscription_tier`** (values seen: `free` / `basic` / `premium`) plus **`subscription_status`** and **`subscription_current_period_end`**.
- It's exposed app-wide via `useAuth()` → `profile.subscription_tier` / `profile.subscription_status` (see `AuthContext.tsx`).
- `src/lib/stripe.ts` provides `SUBSCRIPTION_TIERS` and an **`isSubscriptionActive(status)`** helper; `Billing.tsx` reads `profile.subscription_tier` (defaulting to `"free"`).
- **Gate design:** add a single check (e.g. a `hasCrmAccess(profile)` helper in `permissions.ts` or `stripe.ts`) combining `subscription_tier` + `isSubscriptionActive()`, enforced at **one place** — the CRM routes in `App.tsx` (alongside the existing `ProtectedRoute` / `requiredPermission` pattern). Because it's one gate point, flipping on the approved tier rule later is a one-line change. Until Dani decides, the gate stays open (permission-only, matching briefs).

---

## Risks & guardrails (carry into the build)

1. **"Client" is an overloaded word.** New `clients` table (household) sits beside existing `client_briefs` + its `client_name` free-text field. Two nav items ("Clients" and "Client Briefs") is intended, but at the code/data level `clients` vs `client_briefs` is a footgun — name and comment carefully. Source-of-truth rule per decision 3.
2. **Do NOT copy the Briefs pages' styling.** `ClientBriefs.tsx` uses generic Tailwind (`bg-green-100 text-green-800`, `font-serif`, `text-muted-foreground`) — this is **not** quiet luxury. Copy `ClientBriefForm` **only** for the raw-fetch pattern; take **all** styling from `CLAUDE.md` (forest #2D6350, rose gold #B76E79, ivory #F6F1EA, Cormorant/DM Sans, muted elegant badges, no heavy red alert blocks).
3. **Omit the dead Supabase import.** Briefs pages `import { supabase } from "@/integrations/supabase/client"` but never use it (raw fetch only). CRM files should **not** import it at all — removes the temptation to call `supabase.from()` (which deadlocks on this project).
4. **`next_action_date` is app-level validation, not a DB constraint.** Spec requires a next action for *live* clients but allows prospects/closed records without one — enforce in the form/validation layer, never as a NOT NULL column, or inserts will fail.
5. **Replace `window.confirm()` with an elegant dialog (later).** Briefs delete uses the native browser confirm popup. For the premium CRM, use a styled dialog component instead of `window.confirm`.
6. **Raw-fetch pattern is mandatory everywhere.** Inline `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`, access token from `localStorage['sb-{VITE_SUPABASE_PROJECT_ID}-auth-token']`; GET with `apikey` + `Bearer`; POST adds `Content-Type` + `Prefer: return=representation`. New CRM tables need matching RLS policies keyed on `agent_id`.

---

## Reference: current `client_briefs` columns (verified live, read-only, 3 Jul 2026)

Owner FK is **`agent_id`** (uuid). Has **`client_name`** (text) and **`brief_name`** (text). **No `client_id`.** `status` is text (`active|matched|on_hold|archived`). Child table `client_brief_locations` links via `brief_id`. Full column list was captured during planning; the key facts for CRM design are: `id`, `agent_id`, `client_name`, `brief_name`, `status`, budget/bed/bath ranges, `preferred_suburbs`, `expiry_date`, `matched_properties_count`, `created_at`, `updated_at` — plus a large set of detailed preference fields.

---

## 📌 Follow-up doc tasks
- **Update `README.md`** to reference this roadmap (`docs/CRM_ROADMAP.md`) so the CRM plan is discoverable from the project entry point.
- Subscription-gating decision is logged as item **#23** in `docs/DANI_APPROVAL_CHECKLIST.md`.
