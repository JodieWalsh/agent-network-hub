# Geneva Roadmap — Buyers Agent Hub's Internal CRM

**Created:** July 5, 2026 (planning only — no code exists yet)
> ⚠️ **TEMPORARY DEMO DATA (July 2026):** `geneva-demo-data.mjs seed` populates ~24 fake contacts (all emails `@geneva-demo.example`) so Dani can review a lively dashboard. **Must be wiped after her review**: `node geneva-demo-data.mjs wipe` (deletes ONLY the demo domain — real waitlist leads are never touched; never push demo contacts to Mailchimp). Remove this note once wiped.

**Status (updated July 6, 2026): 🎉 GENEVA v1 COMPLETE — all four phases live.** Tables + list + form (`8e8b891`, `f718c4a`), the contact record (`9cabd76`), the Mailchimp push (`c69406d`), and the **command-centre dashboard + saved views** (`f266e4e`). Landing-page lead capture pieces 1–2 shipped too (`8feef7a`, `66af5da`) — the full pipeline works end-to-end: waitlist form → Geneva → funnel/attention list → explicit push → Mailchimp. What remains is post-v1 backlog (questionnaire, welcome email, two-way sync — see below and `docs/IDEAS_BACKLOG.md`).
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
   - `professional_type` — single-select, six types *(decided July 5; tokens verified at Phase 1 build; **"Building and Pest Inspector" naming approved by Dani, July 5**)*: **Buyers Agent (default)** `buyers_agent`, Real Estate Agent `real_estate_agent`, Conveyancer `conveyancer`, Mortgage Broker `mortgage_broker`, **Building and Pest Inspector** `building_and_pest_inspector` (in Australia building + pest go together as one service; token renamed via migration `20260705020000` while the table was empty), Stylist `stylist`. *(Resolved from planning: the platform's live `user_type` enum has only 4 values — building/pest inspector and stylist are Geneva-only types for now, which is fine: Geneva tracks prospects who need no app account. "Property Manager" from the earlier draft was dropped.)*
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

### Phase 1 — Foundations: tables + contact list + add/edit ✅ COMPLETE (`8e8b891`, `f718c4a`)
- Migration: `geneva_contacts`, `geneva_tasks`, `geneva_notes`, `geneva_activities` with team-role RLS (shared view) and a unique email constraint on contacts.
- Contacts list page (sortable/filterable table; stage + source + owner visible at a glance).
- Add/Edit contact form with the lean field set, duplicate-email guard, and consent status.

### Phase 2 — Contact record: timeline, notes, tasks/reminders ✅ COMPLETE (`9cabd76`)
- Contact record page with tabs/sections: overview, notes, tasks, activity timeline.
- Stage changes (with required reason on Inactive), owner reassignment, timeline events for everything meaningful.
- Task reminders surfaced (due today / overdue) so follow-ups never slip.

### Phase 3 — One-way Mailchimp push ✅ COMPLETE (July 5/6 2026, commit `c69406d`)
- Push email / name / professional type / consent to Mailchimp (edge function holds the API key — never in frontend).
- `pushed to Mailchimp` timeline event + a visible per-contact push status.
- **Firm consent rule (decision 3 above): only `subscribed` contacts are ever pushed** — pending/unsubscribed/bounced/complained never leave Geneva.
- **Needed at this phase (deferred from planning, July 5):** the Mailchimp API key (stored as an edge-function secret via `supabase secrets set`, never in frontend), the target audience ID, and the push trigger. **Current lean (to confirm at Phase 3): an explicit "Push to Mailchimp" BUTTON** — the agent stays in control — not automatic-on-create.

### Phase 4 — Working views + dashboard ✅ COMPLETE (July 6 2026, commit `f266e4e`)
- Saved views/segments (e.g. New this week / Needs follow-up / By source / Nurturing).
- A small internal dashboard: contacts by stage, by source, tasks due — the "command centre" feel.

---

## LATER / deliberately NOT in v1

- Two-way Mailchimp sync (opens, clicks, unsubscribes back into the timeline)
- Full field-level audit log
- UTM / first-touch / latest-touch attribution fields *(UTM capture becomes relevant in the Landing-Page Lead Capture phase below)*
- Bulk actions
- CSV export
- Questionnaire automation
- Duplicate merge tools
- Roles beyond admin/editor
- **Stripe/payments tie-in** — buyers agents paying BAH will eventually flow into Geneva (the subscription webhook → `profiles` pipeline documented in `docs/STRIPE_STATUS.md` §6 is exactly the data Geneva will sit on top of) — but NOT in this v1.
- **Landing-page lead capture** — see the dedicated future-phase section below (form + questionnaire + UTM + welcome email as ONE cohesive feature).

---

## Interview Funnel (post-v1 — pieces 1–3 ✅ DONE, July 6/7 2026)

The high-touch, relationship-based outreach process for treasured buyers agents (each worth $1,000+/yr): personalised intro email → call to book → questions + Zoom confirmation → reminder text → recorded interview (YouTube/socials content) → thank-you → promo clips. Two populations, different compliance rules — **waitlist** (opted in; Mailchimp-eligible once subscribed) vs **interview_outreach** (we reached out; NEVER pushed without explicit RECORDED consent — AU Spam Act).

- ✅ **Piece 1 (`3a2ea21`)** — `contact_type` label ('waitlist' | 'interview_outreach', default waitlist, CHECK; existing rows + public intake safe by default).
- ✅ **Piece 2 (`024cb6b`)** — Outreach chip (record + list), form type picker with not-opted-in note, Type filter, and the **consent-evidence compliance wall**: outreach → subscribed requires a "how was consent obtained" note written as a `consent_changed` activity on the append-only timeline; `geneva-mailchimp-push` refuses outreach contacts without that entry. A bare dropdown flip cannot push.
- ✅ **Piece 3 (`42582c6`)** — the `interview_stage` pipeline (11 tokens: to_contact → intro_email_sent → call_made → interview_booked → questions_sent → reminder_sent → interviewed → thanked → clips_sent, + declined / declined_kept_on_list): numbered stage picker replaces the lifecycle badge on outreach records only, timeline-logged moves, days-in-stage, dismissible advisory task suggestions (never automatic). Waitlist contacts completely unaffected.
- ⏳ **Piece 4** — keep outreach OUT of the dashboard's waitlist funnel metrics + a small interview-funnel widget (contacts per interview stage).
- ⏳ **Piece 5** — personalised-email drafting helper (Jodie's research in → on-brand draft out, Brand Kit voice); templates for steps 1/3/6/7. TODO alongside: an "Outreach" Mailchimp tag on consented pushes.
- 🔴 **PARKED (legal/Dani conversation)** — any auto-harvesting/web-scraping of agents' personal emails/phones. Deliberately NOT built; hand-research fits the treasured-individual ethos anyway.

## Landing-Page Lead Capture (future phase — Jodie is keen; early post-v1 candidate)

Four pieces that work together as **ONE cohesive feature**: interested professionals land on the public site, tell us who they are, arrive in Geneva already attributed to their source, and get a warm hello — no manual entry, no one slipping through.

1. **Public email/contact capture form** on the app's landing page — a public waitlist form that creates a `geneva_contacts` row directly. *Build constraint (already flagged):* public writes can't go through Geneva's admin-only RLS, so this needs a **SECURITY DEFINER RPC or an edge function**, with **consent captured at the form** (only explicit opt-in becomes `subscribed` — the firm Mailchimp rule applies from the moment of capture).
   - ✅ **Piece 1 DONE (July 5, 2026) — the secure write-path**: `geneva-lead-intake` edge function, deployed public (`--no-verify-jwt`) + migration `20260705030000` (nullable `created_by`; NULL = landing-page intake, timeline shows "Landing page"). Write-only by construction: returns ONLY `{ ok: true }`; forced-safe server-side defaults (stage `new`, no owner, consent `subscribed` ONLY on explicit `consent_opt_in === true`); UTM → `original_source` mapping; duplicate emails return the same generic success (**no email enumeration**) and append a `source_captured` activity to the existing contact; honeypot field; origin allow-list; strict validation. RLS untouched — anon verified reading zero rows and blocked from direct inserts. **Deferred by decision: per-IP rate limiting + captcha (Turnstile) land with the real form in Piece 2** — v1 posture is honeypot + validation, accepted knowingly.
2. **Short questionnaire** — after (or as part of) the capture form, a few friendly OPTIONAL questions to qualify/segment the lead: professional_type, region/market, team size, current tools, biggest pain point, interest in early access/founding cohort, willingness to speak with Dani. Answers land on the contact (and/or a linked questionnaire record) and appear in the Geneva activity timeline. *(Matches the "questionnaire support" section of the original Geneva spec.)*
3. **Source / UTM tracking** — the capture form records where the lead came from, so links shared on LinkedIn, Instagram, etc. are attributable. Capture `original_source` + `source_detail`, and support UTM params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) from the landing URL, mapped into the contact's source fields. *(This is the fuller attribution from the spec that was deferred from v1 — it becomes relevant here.)*
4. **Welcome email** — on signup, send a quick friendly welcome/confirmation email via **Resend** (the app's existing email tool, from `hello@buyersagenthub.com`), respecting consent. Log a `welcome_email_sent` event to the contact's timeline. *(Note: `buyersagenthub.com` is not yet verified in Resend — emails currently send from `onboarding@resend.dev`; domain verification is a prerequisite for the branded from-address.)*

## Open decisions — status (updated July 5, 2026)

1. ✅ **DECIDED — role gating:** Geneva v1 is **admin-only** (Jodie and Dani are both admins). See decision 2 above.
2. ✅ **DECIDED — consent:** only `subscribed` contacts are ever pushed to Mailchimp (firm rule, decision 3 above).
3. ✅ **DECIDED — professional types:** all six platform types, Buyers Agent default (decision 4 above; reconcile the Property Manager vs Mortgage Broker token at Phase 1).
4. ✅ **RESOLVED at Phase 3 (July 5/6):** API key in the `MAILCHIMP_API_KEY` edge-function secret (with `MAILCHIMP_SERVER_PREFIX`/`MAILCHIMP_AUDIENCE_ID`); audience `606099323d`; merge fields `PTYPE`/`REGION`/`SOURCE` + built-in `FNAME`/`LNAME`; tags "Geneva CRM" + professional-type label; trigger CONFIRMED as the explicit **"Push to Mailchimp" button** — never automatic.

## 📌 Follow-up doc tasks

- ✅ `README.md` references this roadmap (done July 5, same commit).
- Save the full Geneva design spec into the repo as `docs/GENEVA_DESIGN_SPEC.docx`.
