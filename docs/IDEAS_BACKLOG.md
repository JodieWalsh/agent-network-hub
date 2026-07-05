# Ideas Backlog — Captured, Not Yet Built

**Created:** July 5, 2026
**Purpose:** Jodie's captured-but-not-yet-built ideas, so nothing gets lost between sessions. **Each item needs its own planning session before any code** — this doc records intent, not specs. When an item gets planned, give it a proper doc/section and link it from here.

---

## 1. 🎨 Brand Kit — *build next*
A single reference doc of the quiet-luxury brand: exact colours, fonts, voice/tone, and personality ("Spotlight/Ka-ching"), written **global-friendly** (US/UK expansion). One source of truth for every page, email, and social asset — CLAUDE.md's DESIGN VISION covers the app UI; this extends it to the whole brand.

## 2. 🗺️ Waitlist Regions
Capture which regions a buyers agent **represents** (not just where they're based) on the waitlist form. Reuse the app's existing work-regions UI/pattern from user settings. Needs: the `geneva-lead-intake` edge function + `geneva_contacts` extended to store regions.

## 3. 💌 Welcome Email
Instant on-brand confirmation via **Resend** when someone joins the waitlist (lead-capture piece 4); ongoing nurture stays with Mailchimp. **Prerequisite:** `buyersagenthub.com` domain verification in Resend for the `hello@` from-address (emails currently send from `onboarding@resend.dev`).

## 4. 📮 Mailchimp Push — Geneva Phase 3
One-way push of **`subscribed`-only** contacts (firm rule — see `docs/GENEVA_ROADMAP.md`). **Account details now gathered (July 5):** server prefix `us19`, audience id `606099323d`; the API key is held by Jodie and **must live in an edge-function secret (`supabase secrets set`), NEVER in frontend code or this repo**. Still to confirm at build: the explicit **"Push to Mailchimp" button** (Jodie's lean) vs automatic-on-create.

## 5. 📝 Questionnaire — lead-capture piece 3
Short, optional qualifying questions after waitlist signup (professional type detail, region/market, team size, current tools, biggest pain point, early-access interest, willing to speak with Dani). Answers land on the Geneva contact + timeline. Spec'd at a high level in `docs/GENEVA_ROADMAP.md` (Landing-Page Lead Capture section).

## 6. 🏞️ Property Overlays
Show automatic risk/planning overlays on listings — bushfire, flood, heritage, zoning/subdivision. **Strategy:** use the **Develo** vendor API first for a fast national launch, then build state-by-state integrations (VicPlan, PlanWA, NSW flood portal) later; keep **G-NAF** for address normalisation + **Mapbox** for the map UI. ⚠️ **Must verify Develo's SaaS redistribution licensing before committing (Dani + legal)** — related pricing question already tracked as Dani checklist #22. Full research summary exists (Jodie holds the source doc — save it into `docs/` when planning starts). Slight scope expansion but high-value; the landing page already teases this section as "coming soon".

## 7. 🪧 Landing Page Pre-Launch Messaging
The bigger pass deferred from the July 5 honesty fix: JOIN FREE → waitlist CTA strategy, pricing reframe ("founding-member pricing, locked in at launch"), the four remaining AU-specific copy spots, and whether app pages stay publicly browsable pre-launch. **Tracked as Dani checklist item #24** — decision needed before build.
