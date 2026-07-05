# Geneva Roadmap — Buyers Agent Hub's Internal CRM

**Created:** July 5, 2026 (planning only — no code exists yet)
**Status:** v1 scope + all pre-build decisions CONFIRMED with Jodie (July 5). Ready for Phase 1 when she gives the word. Only the Phase-3 Mailchimp practicalities remain deferred (by design).
**Source spec:** the full Geneva design spec (shared during planning, deliberately scoped DOWN for an achievable v1). ⚠️ The spec is not yet saved into this repo — add it as `docs/GENEVA_DESIGN_SPEC.docx` (mirroring `docs/CRM_DESIGN_SPEC.docx` for Monaco) so future sessions can read it.
**Design system:** Quiet Luxury (see `CLAUDE.md` → DESIGN VISION).

---

## What Geneva is (one paragraph)

Geneva is **Buyers Agent Hub's OWN internal growth command-centre** — for Jodie & Dani to capture, nurture, and support buyers agents (and other pros) as **BAH's customers**, especially pre-launch. Capture interested professionals, follow up so no one slips through, track where each contact came from, and push them to Mailchimp so nurture emails go out. **Geneva is NOT Monaco**: Monaco (complete, Phases 1–4) is the CRM *buyers agents use* to manage their client households; Geneva is the CRM *we* use to manage the buyers agents themselves.

## Core v1 goals

1. **Capture** contacts + their source.
2. **Follow up** via tasks/reminders.
3. **Nurture** via a ONE-WAY push to Mailchimp so email sequences start.

---

## Decisions locked in (July 5, 2026)

1. **Separate tables.** Geneva gets its OWN fresh tables (`geneva_contacts`, `geneva_tasks`, `geneva_notes`, `geneva_activities`). Do NOT reuse or share Monaco's CRM tables — reuse *patterns and styling*, never tables.
2. **Access model: ADMIN-ONLY, SHARED TEAM VIEW** *(decided July 5 — Jodie and Dani are both admins)*. Geneva v1 is gated to the existing **`admin` role**; regular app users must NOT access it. RLS: any admin can see/edit ALL Geneva rows (shared team view — the opposite of Monaco's owner-only RLS). No new "editor" role in v1 (roles beyond admin are a LATER item).
3. **Mailchimp is ONE-WAY in v1.** Push email/name/type/consent to Mailchimp so sequences start. Two-way sync (opens/clicks/unsubscribes flowing back into the timeline) is a LATER phase.
   - **FIRM CONSENT RULE (decided July 5):** only contacts with `email_consent_status = 'subscribed'` are EVER pushed to Mailchimp. `pending` (and unsubscribed/bounced/complained) contacts stay in Geneva but are **never pushed** — Australian Spam Act safety. Enforce in the push code, not just the UI.
4. **Lean contact record** (NOT the spec's 40+ fields):
   - `first_name`, `last_name`, `email`, `phone`, `company`
   - `professional_type` — single-select, ALL SIX platform professional types *(decided July 5)*: **Buyers Agent (default)**, Real Estate Agent, Conveyancer, Building Inspector, Property Manager, Stylist. ⚠️ Verify the exact enum tokens against the app at build time so Geneva matches — note the platform's `user_type` set documented in CLAUDE.md is `buyers_agent, real_estate_agent, building_inspector, conveyancer, mortgage_broker, stylist` (**Mortgage Broker, not Property Manager**) — reconcile this with Jodie when building Phase 1.
   - `region` / city
   - `lifecycle_stage` (see below)
   - `owner` (Jodie/Dani)
   - `original_source` — single-select: LinkedIn / Instagram / TikTok / YouTube / referral / direct / podcast / event / partner / manual import / other
   - `source_detail` (free text)
   - `email_consent_status` — pending / subscribed / unsubscribed / bounced / complained
   - `notes`
   - Extra spec fields (full UTM set, first-touch/latest-touch attribution, interview flags, Mailchimp status fields, etc.) are LATER additions.
5. **No heavy audit log in v1.** Use the per-contact **activity timeline** instead (record created, note added, stage changed, task created/completed, source captured, consent changed, pushed to Mailchimp). Full field-level audit log is a LATER phase.
6. **Lifecycle stages** (from spec; refine later): New → Engaged → Qualified → Nurturing → Trial/Early access → Active customer → Inactive/not progressing. **Inactive requires a reason**: Not interested / Wrong professional type / No response / Outside target market / Duplicate / Not ready yet / Other.
7. **Duplicate handling:** email is the primary key — prevent exact-duplicate emails on create (unique constraint). Admin merge tooling is a LATER phase.

## Golden rules (same as Monaco — non-negotiable)

- NEVER `supabase.from()` — raw fetch pattern only; never import the supabase client.
- Quiet-luxury design system from `CLAUDE.md` (forest #2D6350, rose gold #B76E79, ivory #F6F1EA, champagne #D8C3B8, Cormorant display / DM Sans UI, tabular numbers).
- Never `window.confirm()` — frosted quiet-luxury dialogs only.
- Verify with puppeteer + zero WCAG contrast issues (desktop + 375px mobile) before any commit.

---

## Suggested v1 build order (one phase at a time)

### Phase 1 — Foundations: tables + contact list + add/edit
- Migration: `geneva_contacts`, `geneva_tasks`, `geneva_notes`, `geneva_activities` with team-role RLS (shared view) and a unique email constraint on contacts.
- Contacts list page (sortable/filterable table; stage + source + owner visible at a glance).
- Add/Edit contact form with the lean field set, duplicate-email guard, and consent status.

### Phase 2 — Contact record: timeline, notes, tasks/reminders
- Contact record page with tabs/sections: overview, notes, tasks, activity timeline.
- Stage changes (with required reason on Inactive), owner reassignment, timeline events for everything meaningful.
- Task reminders surfaced (due today / overdue) so follow-ups never slip.

### Phase 3 — One-way Mailchimp push
- Push email / name / professional type / consent to Mailchimp (edge function holds the API key — never in frontend).
- `pushed to Mailchimp` timeline event + a visible per-contact push status.
- **Firm consent rule (decision 3 above): only `subscribed` contacts are ever pushed** — pending/unsubscribed/bounced/complained never leave Geneva.
- **Needed at this phase (deferred from planning, July 5):** the Mailchimp API key (stored as an edge-function secret via `supabase secrets set`, never in frontend), the target audience ID, and the push trigger. **Current lean (to confirm at Phase 3): an explicit "Push to Mailchimp" BUTTON** — the agent stays in control — not automatic-on-create.

### Phase 4 — Working views + dashboard
- Saved views/segments (e.g. New this week / Needs follow-up / By source / Nurturing).
- A small internal dashboard: contacts by stage, by source, tasks due — the "command centre" feel.

---

## LATER / deliberately NOT in v1

- Two-way Mailchimp sync (opens, clicks, unsubscribes back into the timeline)
- Full field-level audit log
- UTM / first-touch / latest-touch attribution fields
- Bulk actions
- CSV export
- Questionnaire automation
- Duplicate merge tools
- Roles beyond admin/editor
- **Stripe/payments tie-in** — buyers agents paying BAH will eventually flow into Geneva (the subscription webhook → `profiles` pipeline documented in `docs/STRIPE_STATUS.md` §6 is exactly the data Geneva will sit on top of) — but NOT in this v1.

---

## Open decisions — status (updated July 5, 2026)

1. ✅ **DECIDED — role gating:** Geneva v1 is **admin-only** (Jodie and Dani are both admins). See decision 2 above.
2. ✅ **DECIDED — consent:** only `subscribed` contacts are ever pushed to Mailchimp (firm rule, decision 3 above).
3. ✅ **DECIDED — professional types:** all six platform types, Buyers Agent default (decision 4 above; reconcile the Property Manager vs Mortgage Broker token at Phase 1).
4. ⏳ **DEFERRED to Phase 3 — Mailchimp practicalities:** API key (edge-function secret), audience ID, field/tag mapping, and confirming the push trigger. Current lean: explicit **"Push to Mailchimp" button**, not automatic-on-create.

## 📌 Follow-up doc tasks

- ✅ `README.md` references this roadmap (done July 5, same commit).
- Save the full Geneva design spec into the repo as `docs/GENEVA_DESIGN_SPEC.docx`.
