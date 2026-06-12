# Work Regions — Technical Specification

**Buyers Agent Hub** | Version 1.0 | June 2026

---

## Overview & Vision

Work Regions is the foundational personalisation system for Buyers Agent Hub. When a user creates or edits their profile, they select the countries and regions where they work. This single piece of information drives a personalised, contextually relevant experience across the entire platform.

**The vision: one global platform, but every user feels like it was built specifically for their market.**

### What Work Regions Controls

| Feature | How Work Region Affects It |
|---------|---------------------------|
| Property listings | Only show properties in the user's work regions by default |
| Inspection jobs | Filter marketplace jobs to relevant regions |
| Agent directory | Default filter to local agents in same region |
| Forum boards | Show regional boards for their markets only |
| Property overlays | Serve country-appropriate data (AU flood/bushfire, UK Environment Agency) |
| Currency | Auto-set to local currency (AUD, GBP, USD) |
| Terminology | AU: 'Buyers Agent', UK: 'Buying Agent', US: 'Buyer's Agent' |
| Email timing | Notifications sent at sensible local times based on timezone |
| Pricing display | Show subscription prices in local currency |
| Compliance | GDPR notices for UK/EU users automatically |

> **Important:** Work Region is not the same as the user's home location. A Sydney-based agent might work across Australia AND the UK. They should see content for both markets.

---

## Phase 1 — Launch (Australia + UK)

For launch we support two markets. This keeps the scope manageable while opening the UK expansion.

### Supported Markets at Launch

| Market | Countries | Currency | Terminology | Overlay Data |
|--------|-----------|----------|-------------|--------------|
| 🇦🇺 Australia | AU | AUD | Buyers Agent | Develo/Archistar API |
| 🇬🇧 United Kingdom | GB | GBP | Buying Agent / Property Finder | Environment Agency (TBD) |

> Phase 2 will add the US market (USD, 'Buyer's Agent' terminology, FEMA flood zones). The architecture is designed to make adding new markets straightforward.

---

## Database Design

### What Already Exists

Good news — the `profiles` table already has country and currency fields. The `ServiceAreaManager` component also exists. We are **EXTENDING existing infrastructure, not rebuilding it**.

### New: `work_regions` Column on Profiles

```sql
ALTER TABLE profiles ADD COLUMN work_regions TEXT[] DEFAULT ARRAY['AU'];
```

This stores an array of ISO 3166-1 alpha-2 country codes. Examples:

- `['AU']` — Australia only
- `['GB']` — UK only
- `['AU', 'GB']` — Both Australia and UK
- `['AU', 'GB', 'US']` — All three markets (Phase 2+)

### New: `primary_region` Column on Profiles

Records the user's main market (used for defaults when ambiguous):

```sql
ALTER TABLE profiles ADD COLUMN primary_region TEXT DEFAULT 'AU';
```

### New: `region_preferences` JSONB Column

Stores per-region preferences (currency preference, terminology preference, notification timezone):

```sql
ALTER TABLE profiles ADD COLUMN region_preferences JSONB DEFAULT '{}';
```

Example value:

```json
{"AU": {"currency": "AUD", "timezone": "Australia/Sydney"},
 "GB": {"currency": "GBP", "timezone": "Europe/London"}}
```

### Forum Boards — Add Region Tag

The `forum_categories` table needs a region column so boards can be filtered by user's work regions:

```sql
ALTER TABLE forum_categories ADD COLUMN region TEXT DEFAULT 'AU';
```

Seed data for UK launch — add boards for:

- London & South East
- Manchester & North West
- Edinburgh & Scotland
- General UK Market

### Properties & Jobs — Add Region Tag

Properties and inspection jobs already have location data via Mapbox. We derive region from the country code in the location:

- No schema change needed — location already stores country
- Add a computed/indexed region column for performance: `region TEXT GENERATED ALWAYS AS (location_country) STORED`

---

## UI Design

### Profile Setup — Work Regions Step

When a new user signs up (or an existing user edits their profile), add a Work Regions section. This should feel premium and intentional — not like a boring checkbox list.

**Visual Design**

- Section heading: "Where do you work?" in Cormorant Garamond
- Subheading: "We'll personalise your experience for your markets" in DM Sans
- Market cards — one per supported market, each showing: country flag emoji, country name, key terminology, currency
- Cards are selectable — forest green border + champagne background when selected
- Multi-select allowed — user can select both AU and GB
- Primary region selector appears if multiple regions selected: "Which is your main market?"

**Market Cards — Content**

| Card | Flag | Title | Subtitle | Currency shown |
|------|------|-------|----------|----------------|
| Australia | 🇦🇺 | Australia | Buyers Agent market | AUD $ |
| United Kingdom | 🇬🇧 | United Kingdom | Buying Agent market | GBP £ |
| United States (Phase 2) | 🇺🇸 | United States | Buyer's Agent market | USD $ |

**Where This Appears in the UI**

- During signup — as a step after selecting professional type
- In Profile Edit — as a dedicated section with its own save button
- In the onboarding flow — prompted on first login if not yet set

### Dashboard Personalisation

Once work regions are set, the dashboard adapts:

- Welcome card shows relevant market context: "Your Australian & UK dashboard"
- Property spotlight shows properties from their regions
- Activity feed filters to relevant regional activity
- Stats show region-specific numbers where relevant

### Forum Personalisation

Forums automatically show the right regional boards:

- AU-only user: sees Australian state/city boards only
- UK-only user: sees UK regional boards only
- Multi-region user: sees boards for ALL their markets, with a region filter tab
- "Global" board always visible to everyone — for cross-market discussion

### Property & Jobs Filtering

Marketplace and directory default to the user's work regions:

- Default filter: "Your regions" (pre-selected to their `work_regions`)
- "All regions" toggle available for users who want to browse globally
- Search results include region indicators so users know which market a listing is from

### Terminology Localisation

The platform uses the right terminology based on the user's primary region:

| Term (AU) | Term (UK) | Term (US, Phase 2) | Used in |
|-----------|-----------|--------------------|---------|
| Buyers Agent | Buying Agent | Buyer's Agent | Nav, headings, profile labels |
| Property | Property | Home / Real Estate | Listings |
| Suburb | Area / Postcode | Neighborhood / Zip | Location fields |
| Conveyancer | Conveyancer / Solicitor | Title Company | Professional type |
| Auction | Auction | Open House | Event types |

> Terminology is stored in a localisation config file (`src/lib/i18n.ts`) keyed by region code. Components pull terms from this config based on the user's `primary_region`. No hardcoded strings.

---

## Implementation Plan

### Phase 1A — Database (Week 1)

- Add `work_regions`, `primary_region`, `region_preferences` columns to profiles
- Add `region` column to `forum_categories`
- Seed UK forum boards
- Write migration SQL
- Update RLS policies to allow region-based queries

> NEVER use `supabase.from()` — always use raw fetch pattern throughout.

### Phase 1B — Profile UI (Week 1–2)

- Build `WorkRegionSelector` component — premium market cards, multi-select
- Add to ProfileEdit page as new section
- Add to signup flow after user type selection
- Build onboarding prompt for existing users who haven't set regions
- Save to profiles table via raw fetch

### Phase 1C — Forum Personalisation (Week 2)

- Update ForumHome to filter categories by user's `work_regions`
- Add "All Regions" toggle
- Show region badges on forum posts
- Add UK forum boards to seed data

### Phase 1D — Marketplace Personalisation (Week 2–3)

- Update property listings default filter to user's `work_regions`
- Update inspection jobs default filter to user's `work_regions`
- Update agent directory default filter to user's `work_regions`
- Add "Your regions" / "All regions" toggle to each

### Phase 1E — Terminology & Currency (Week 3)

- Create `src/lib/i18n.ts` with terminology config per region
- Update key UI strings to pull from i18n config
- Ensure currency display uses the user's region currency
- Test with a UK test user account

---

## Claude Code Prompt — Phase 1A & 1B

Ready to paste into Claude Code. Covers database migration and profile UI:

```text
--- PROMPT START (copy everything below this line) ---

Read CLAUDE.md and docs/design-reference.png before starting.

TASK: Build the Work Regions feature — Phase 1A (database) and 1B (profile UI).

WHAT THIS FEATURE DOES:
Users select which countries/markets they work in on their profile.
This drives personalised content across the whole platform.
Launch markets: Australia (AU) and United Kingdom (GB).

PHASE 1A — DATABASE MIGRATION:
Create a new migration file in supabase/migrations/ that adds:
1. work_regions TEXT[] DEFAULT ARRAY['AU'] to profiles table
2. primary_region TEXT DEFAULT 'AU' to profiles table
3. region TEXT DEFAULT 'AU' to forum_categories table

Then seed UK forum boards by inserting into forum_categories:
- 'London & South East' (region: 'GB')
- 'Manchester & North West' (region: 'GB')
- 'Edinburgh & Scotland' (region: 'GB')
- 'General UK Market' (region: 'GB')

Apply the migration using raw fetch to the Supabase REST API.
NEVER use supabase.from() — always raw fetch.

PHASE 1B — WORK REGIONS SELECTOR COMPONENT:
Create src/components/profile/WorkRegionSelector.tsx

Design (quiet luxury, matches CLAUDE.md design vision):
- Section heading 'Where do you work?' in Cormorant Garamond
- Subheading 'We'll personalise your experience for your markets' in DM Sans
- Two market cards side by side (stack on mobile):
  Card 1: 🇦🇺 Australia / Buyers Agent market / AUD $
  Card 2: 🇬🇧 United Kingdom / Buying Agent market / GBP £
- Cards are selectable — forest green #2D6350 border + ivory #F6F1EA bg when selected
- Multi-select allowed
- If both selected: show 'Primary market' radio buttons below
- Rose gold #B76E79 checkmark icon on selected cards
- Hover lift effect on cards

Add WorkRegionSelector to:
1. src/pages/settings/ProfileEdit.tsx — as a new section after specializations
2. src/pages/Auth.tsx signup flow — as a step after user type selection

Save work_regions and primary_region to profiles table via raw fetch.

EXISTING INFRASTRUCTURE TO USE:
- PROFILE_COUNTRIES array already exists in ProfileEdit.tsx
- Currency system already exists in src/lib/currency.ts
- ServiceAreaManager component exists for reference
- Raw fetch pattern is used throughout — follow existing patterns

CRITICAL RULES:
- NEVER use supabase.from() — always raw fetch
- Follow quiet luxury design system from CLAUDE.md
- Every button must have explicit text colour
- Verify with puppeteer before committing
- Do not break existing profile save functionality

When done commit and push: 'feat: work regions foundation - database and profile UI'

--- PROMPT END ---
```

---

## Future Phases

### Phase 2 — US Market

- Add US (USD, "Buyer's Agent" terminology, FEMA flood zones)
- Add US city forum boards
- US-specific property overlay data integration
- US timezone handling

### Phase 3 — Full Localisation

- Multi-language support (not just terminology — full translation)
- Country-specific compliance (GDPR for EU, state licensing for US)
- Local payment methods
- Country-specific accreditation bodies

### Phase 4 — Region Analytics

- Show admins which regions are growing
- Show users their reach across regions
- Cross-region referral system — AU agent refers UK client to UK agent

---

**One platform. Every market.**

buyersagenthub.com | hello@buyersagenthub.com

---

*Converted from `BAH-WorkRegions-TechSpec.docx` (June 2026) — this Markdown version is the canonical development spec.*
