# How to Resume Development with Claude

This document explains how to start a new Claude session and get up to speed fast.

**Last Updated:** July 4, 2026
**Project:** Buyers Agent Hub (agent-network-hub)
**Live URL:** https://agent-network-hub-1ynd.vercel.app

---

## 📍 WHERE WE ARE (July 4, 2026)

The entire app now uses the **quiet luxury design system** (see CLAUDE.md → DESIGN VISION). Dashboard, Auth, and every other page passed WCAG contrast audits. The legacy inspection routing bug is fixed. A full codebase audit lives at `docs/CODEBASE_AUDIT.md` — read it for the honest state of everything.

**Update (July 3, 2026, later that day): CRM Phase 1 is 100% COMPLETE.** The client management system now has: 5 database tables with owner-only RLS (migration `20260703010000`), a Clients list view + New Client form (`/clients`, `/clients/new`), a full Client record page (`/clients/:id`) with Overview/Members/Tasks/Timeline tabs, **stage-change controls** on the record (lifecycle + buying pickers with timeline logging — `a21318f`), and a **Board (Kanban) view** on the Clients page with drag-and-drop stage changes and List/Board + By Relationship/By Buying Stage toggles (`9a741a1`). Earlier commits: `46039ff`, `7b0d002`, `2147eb4`. **Update (July 4, 2026): the core of CRM Phase 2 is DONE.** Three pieces landed today: the **CRM dashboard snapshot** (commit `7eaaae0` — Clients Needing Attention / Tasks Due Today / Active Households widgets + needs-attention preview + quick actions, `CrmSnapshot.tsx`, gated by `CAN_MANAGE_CLIENT_BRIEFS`), the **nullable `client_id` FK on `client_briefs`** (commit `8e0bef6`, migration `20260704010000`, applied + verified live), and the **full Clients ↔ Briefs linking** (commit `d017fa2` — link/unlink from the Client record's Brief tab, brief summary card, `brief_linked`/`brief_unlinked` timeline events, `household_name` kept as source-of-truth, existing briefs pages untouched). The CRM now connects to briefs and the dashboard. (The `household_name` source-of-truth rule was verified across the whole CRM — nothing needed changing.) **CRM Phase 3 has begun: the read-only Inspections tab is DONE** (commit `91ce949` — a household's inspections surface on the Client record via household → linked brief → `inspection_jobs.client_brief_id`; zero schema changes, zero writes to inspection tables). **Remaining Phase 3 work: Properties** — new `client_properties` join table + picker UI + candidate→purchased pipeline (see `docs/CRM_ROADMAP.md`, read it before any CRM work). Subscription gating for the CRM is Dani item #23 and is NOT yet enforced.

**Update (June 29, 2026):** Dashboard stats are now wired to real data (done 12 June, commit `92c4d6c` — `StatsGrid` uses real raw-fetch queries, no longer placeholders). A security remediation also happened 29 June: `.env` was untracked from git, and the Supabase secret key + access token were rotated — see the 29 June entry in `SESSION_RECORD.md` for full detail. **Tooling note:** Fable 5 is currently unavailable, so use **Opus 4.8** (high effort) in Claude Code for complex tasks.

**Start every session by reading:** `CLAUDE.md`, then `docs/CODEBASE_AUDIT.md`, then the latest entry in `SESSION_RECORD.md`.

**Verify visual changes with the puppeteer scripts in repo root** (they log in as the seeded admin and run WCAG contrast audits):
- `node dashboard-verify.mjs` — dashboard, desktop + 375px mobile + drawer
- `node auth-verify.mjs` — auth page, both modes + mobile
- `node palette-verify.mjs` — landing, forums, messages, marketplace, directory, briefs, pricing, settings
Dev server for these: `npm run dev -- --port 8081`

**Next up:**
1. **Work Regions feature** — spec at `docs/WORK_REGIONS_SPEC.md`. Read it first, then implement (Phase 1A database + 1B profile UI; a ready-to-use prompt is embedded in the spec).
2. Replace mock geocoder in Directory/Marketplace/Inspections filters with Mapbox (`LocationSearchFilter` → real geocoder) — international users currently can't filter by location
3. Regenerate Supabase types (`npx supabase gen types`) — fixes most of the 93 pre-existing tsc errors
4. Delete dead code: `Inspections.tsx`, `PostInspection.tsx`, `WelcomeHeader.tsx`, `NavLink.tsx`
5. Resend activation (set `RESEND_API_KEY`, verify domain) + review system completion — see audit items 5–10

---

## 🔐 SECURITY PROTOCOLS (Read First!)

These rules were established May 30, 2026 after a security audit. Follow them every session.

### The Golden Rules

1. **NEVER commit `.env` to GitHub** — it is now in `.gitignore`. Keep it that way.
2. **Secret keys live in two places only:**
   - Your local `.env` file on your computer
   - The private "Buyers Agent Hub" Google Drive folder (as a backup doc)
3. **If you ever need to rotate keys** (e.g. another accidental exposure), go to:
   - Supabase → Settings → API → use the NEW "Publishable and secret API keys" tab
   - Mapbox → account.mapbox.com → Tokens → Create new, delete old
   - Stripe → dashboard.stripe.com → Developers → API Keys
4. **The GitHub repo is PUBLIC** — never paste real keys anywhere in code or docs
5. **Run `git status` before every push** to confirm `.env` is not in the list

### What Was Done (May 30, 2026)

- Discovered `.env` was publicly visible on GitHub
- Rotated all Supabase keys (now using new `sb_publishable_` / `sb_secret_` format)
- Disabled old legacy JWT-based Supabase API keys
- Rotated Mapbox token (old `Default public token` deleted, new `buyers-agent-hub-production` created)
- Added `.env` to `.gitignore` — will never be committed again
- Saved all keys to private Google Drive backup

### What Was Done (June 29, 2026)

- **June 29, 2026:** Discovered .env was still tracked by git and exposed on public repo. Untracked it (git rm --cached), rotated Supabase secret key and access token, deleted old keys. .gitignore now effective. Stripe secrets in .env were only placeholders.

### Current Key Locations

| Key | Where to regenerate if lost |
|-----|---------------------------|
| `VITE_SUPABASE_PUBLISHABLE_KEY` | supabase.com → Settings → API → Publishable key |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Settings → API → Secret key |
| `VITE_SUPABASE_URL` | supabase.com → Settings → API (never changes) |
| `VITE_SUPABASE_PROJECT_ID` | `yrjtdunljzxasyohjdnw` (never changes) |
| `VITE_MAPBOX_ACCESS_TOKEN` | account.mapbox.com → Tokens → buyers-agent-hub-production |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API Keys |
| `VITE_STRIPE_PUBLISHABLE_KEY` | dashboard.stripe.com → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com → Developers → Webhooks |

---

## 🚀 Quick Start — Copy and Paste This Into Claude Code

```
I'm working on Buyers Agent Hub, a B2B SaaS marketplace platform for Australian real estate professionals (buyers agents, building inspectors, conveyancers, property managers).

PROJECT CONTEXT:
- Platform: React + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Supabase (PostgreSQL with PostGIS, Storage, Auth, Realtime, Edge Functions)
- Payments: Stripe (subscriptions + Connect for marketplace payouts)
- Location: Mapbox Geocoding API
- Email: Resend API
- Deployment: Vercel
- GitHub: https://github.com/JodieWalsh/agent-network-hub
- Live URL: https://agent-network-hub-1ynd.vercel.app
- Current branch: main

CRITICAL TECHNICAL NOTE — RAW FETCH PATTERN:
The Supabase JS client hangs indefinitely due to a deadlock in onAuthStateChange.
ALL database operations use raw fetch() to the Supabase REST API instead.
NEVER use supabase.from() — it will hang!
Always use the raw fetch pattern documented in PROJECT_CONTEXT.md.

DESIGN SYSTEM (Quiet Luxury — full spec in CLAUDE.md DESIGN VISION section):
- Forest green primary #2D6350, deep green #173A31
- Rose gold accent #B76E79 (use #8F4E58 for small text on light backgrounds)
- Champagne #D8C3B8, warm ivory background #F6F1EA, charcoal text #1C1917
- Cormorant Garamond display headings ONLY; DM Sans everything else
- Numbers always DM Sans tabular-nums (never Cormorant)
- Design reference saved to docs/design-reference.png

KEY PROJECT FILES TO READ FIRST:
1. PROJECT_CONTEXT.md — full architecture, session history, technical notes
2. docs/DANI_APPROVAL_CHECKLIST.md — business decisions needing co-founder sign-off
3. docs/PROJECT_TODO.md — prioritised feature backlog
4. HOW_TO_RESUME_WITH_CLAUDE.md — this file

COMPLETED MAJOR SYSTEMS:
- Full inspection marketplace workflow (7 phases, end-to-end working)
- Real-time messaging (Supabase Realtime, typing indicators, read receipts)
- Stripe subscriptions (pricing, checkout, welcome flow, billing portal)
- Community forum (posts, comments, moderation, premium categories)
- Email notifications (Resend API, 12 HTML templates, weekly digest)
- Visual overhaul (luxury real estate design system)
- Notification system (in-app bells, 12 notification types)
- 16-section inspection report builder with auto-save
- Client brief system with location priority tiers
- Global location system (Mapbox, PostGIS, works worldwide)

NEXT PRIORITY:
See "WHERE WE ARE (June 12, 2026)" at the top of HOW_TO_RESUME_WITH_CLAUDE.md.
(Stripe Connect payouts, multi-currency, forum phases 1-3, email via Resend,
and the quiet luxury redesign are all DONE.)

Please read PROJECT_CONTEXT.md first, then let me know you're ready and I'll tell you what I need help with.
```

---

## 🛠️ Common Commands

### Start Dev Server
```
npm run dev
```
Server runs on http://localhost:8087

### Run Database Migrations
```
npx supabase db push
```
Note: SUPABASE_ACCESS_TOKEN must be set in your `.env` file.

### Check TypeScript Errors
```
npx tsc --noEmit
```

### Git Workflow (Safe Version)
```
git status          ← always check this first, confirm .env is NOT listed
git add .
git commit -m "feat: your description here"
git push
```

### Deploy Edge Functions
```
supabase functions deploy function-name
supabase secrets set KEY_NAME=value
```

---

## 🏗️ Project Structure

```
agent-network-hub/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── layout/         # Sidebar, TopBar, DashboardLayout
│   │   ├── location/       # Mapbox location search
│   │   ├── notifications/  # NotificationBell, NotificationDropdown
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # AuthContext, UnitsContext
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (notifications, stripe, permissions, geocoder)
│   └── pages/
│       ├── inspections/    # MyPostedJobs, MyInspectionWork, Spotlights
│       └── settings/       # ProfileEdit, billing
├── supabase/
│   ├── functions/          # Edge Functions (stripe-*, email-*)
│   └── migrations/         # Database migrations (chronological)
├── docs/                   # Project documentation
├── .env                    # Secret keys — NEVER commit this!
├── .gitignore              # Includes .env — keep it that way!
└── PROJECT_CONTEXT.md      # Full project history and architecture
```

---

## ⚠️ Critical Patterns — Read Before Writing Any Code

### 1. Raw Fetch Pattern (MANDATORY — not optional)
```javascript
const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {}
  return { supabaseUrl, supabaseKey, accessToken };
};
```

### 2. Supabase RPC Calls
Always `await` rpc() calls or post counts won't update (lazy evaluation issue).

### 3. Date Validation
Three layers required: inline feedback + disabled submit button + API-level guard.

### 4. Vercel Routing
SPA deployments need `vercel.json` with rewrite rules to avoid 404 errors.

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `guest` | Limited — browsing only, awaiting approval |
| `pending_professional` | Submitted credentials, awaiting verification |
| `verified_professional` | Full platform access |
| `admin` | Full access + platform management |

---

## 💳 Payment Architecture

### Stripe Subscriptions (Live)
- Basic Plan: $29/month or $290/year
- Premium Plan: $79/month or $790/year
- Edge functions: `stripe-create-checkout`, `stripe-create-portal`, `stripe-webhook`

### Stripe Connect (Next to Build)
- Inspectors receive 90% of inspection fee
- Platform keeps 10%
- Payment held in escrow until job poster approves report
- Edge functions scaffolded: `stripe-connect-onboarding`, `stripe-connect-dashboard`

---

## 📧 Email System

- Provider: Resend API
- FROM email: currently `onboarding@resend.dev` (pending domain verification for buyersagenthub.com)
- 12 HTML templates covering 8 marketplace + 4 forum trigger types
- Weekly digest via Edge Function
- **Note: Email testing not yet completed**

---

## 🔄 Inspection Marketplace Workflow

```
Job Posted (open)
    ↓
Inspector Bids → Job Poster Reviews
    ↓
Bid Accepted (assigned)
    ↓
Inspector Completes 16-Section Report (in_progress → pending_review)
    ↓
Job Poster Approves Report (completed)
    ↓
[NEXT] Stripe Connect releases 90% payment to inspector automatically
```

---

## 🤝 Co-Founder Protocol (Dani)

Dani is co-founder and must approve certain decisions before implementation.
Check `docs/DANI_APPROVAL_CHECKLIST.md` before making changes to:
- Pricing or subscription tiers
- Legal terms or policies
- Content decisions affecting the brand
- New user-facing features that change the product direction

---

## 🐛 Common Issues & Solutions

### Supabase JS client hanging
**Cause:** Known deadlock in `onAuthStateChange` callback
**Solution:** Use raw fetch pattern (see above). Never use `supabase.from()`

### "new row violates row-level security policy"
**Solution:** Check user role in profiles table and RLS policies for the table

### GitHub credentials cached under wrong account
**Solution:** Clear via Windows Credential Manager

### 404 errors on Vercel after deploy
**Solution:** Check `vercel.json` has SPA rewrite rules

---

## 📋 Backlog (Prioritised — June 29, 2026)

1. **Work Regions feature** ← NEXT (spec: docs/WORK_REGIONS_SPEC.md)
2. Real Mapbox geocoding in Directory/Marketplace/Inspections filters (mock geocoder is AU-only)
3. Regenerate Supabase types + clear the 93 pre-existing tsc errors
4. Review system completion (table exists, no write UI; ratings hardcoded)
5. Email notification testing + buyersagenthub.com domain verification (Resend)
6. Dead code cleanup (Inspections.tsx, PostInspection.tsx, WelcomeHeader.tsx, NavLink.tsx)
7. Migrate remaining ~33 supabase.from() calls to raw fetch (AuthContext, Admin, Marketplace...)
8. CRM system with client management and automated workflows
9. Expanded user/job types (pest inspectors, property managers)

---

## 📁 Documentation Files

| File | Purpose |
|------|---------|
| `HOW_TO_RESUME_WITH_CLAUDE.md` | This file — how to start a session |
| `PROJECT_CONTEXT.md` | Full architecture, session changelogs, technical notes |
| `docs/DANI_APPROVAL_CHECKLIST.md` | Business decisions needing co-founder sign-off |
| `docs/PROJECT_TODO.md` | Feature backlog |
| `docs/TECHNICAL_DOCUMENTATION.md` | Deep technical reference |
| `docs/KEY_FEATURES.md` | Platform features overview |
| `docs/design-reference.png` | Dani's visual design direction |
| `CLAUDE_PROMPT_QUICKSTART.txt` | Copy-paste prompts for common tasks |
| `SESSION_RECORD.md` | Session history log |

---

## 🔗 Key Links

| Resource | URL |
|----------|-----|
| GitHub Repo | https://github.com/JodieWalsh/agent-network-hub |
| Live App | https://agent-network-hub-1ynd.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw |
| Stripe Dashboard | https://dashboard.stripe.com |
| Mapbox Tokens | https://account.mapbox.com/access-tokens |
| Resend Dashboard | https://resend.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |

---

*Last Updated: June 12, 2026 — Quiet luxury design rollout complete, legacy routing fixed, codebase audited, admin scripts migrated to SUPABASE_SECRET_KEY*
