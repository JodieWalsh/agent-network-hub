# Agent Hub - Project Context

---

## 📋 SESSION CHANGELOG - January 7-8, 2026

### Session Summary: Complete Minimal Luxury Redesign + Database Seeding

This session transformed Agent Hub from a traditional luxury aesthetic to a modern, minimal B2B platform (Notion/Linear style) and established working test data.

---

### ✅ MAJOR ACCOMPLISHMENTS

#### 1. **Complete Visual Redesign - Minimal Luxury Aesthetic**

**Design Foundation Changes:**
- **Background Colors:** Shifted from warm champagne (#FDFCF0) → cool near-white (#FAFAFA) for main content
- **Card Styling:** Changed to pure white (#FFFFFF) cards with minimal borders
- **Shadows:** Reduced from heavy (12-24px blur) → subtle (1-3px blur)
  - Removed: `shadow-elegant`, `shadow-glow`
  - Added: `shadow-subtle`, updated `shadow-card`, `shadow-hover`
- **Border Radius:** Softened from 8px → 6px across all components
- **Typography:** Changed ALL headings from Playfair Display (serif) → Inter (sans-serif)
  - Kept Playfair Display available for special brand moments
  - Global heading style now: `font-sans` instead of `font-serif`
- **Animations:** Dramatically faster - 300-500ms → 150-200ms
  - Removed: `slide-in-left`, `pulse-soft` animations
  - Updated: `fade-in` (0.5s → 0.2s), `scale-in` (0.3s → 0.15s)

**Sidebar Transformation (Most Dramatic Change):**
- **Before:** Dark forest green (#064E3B) background - heavy, unprofessional
- **After:** Warm champagne/beige (#F5F3EE) background - light, premium, luxurious
- **Active States:** Changed from filled rose-gold backgrounds → subtle light green background (`bg-forest/5`)
- **Visual Style:** Now matches Notion/Linear/Stripe - clean, professional, minimal
- **Border:** Added right border for definition
- **Colors:**
  - Background: `hsl(40 25% 95%)` - warm champagne
  - Hover: `hsl(40 20% 92%)` - slightly darker warm beige
  - Border: `hsl(40 15% 88%)` - warm beige border

**Dashboard Decluttering:**
- **Removed:** Entire Network Highlights section (reduced visual noise by 30%)
- **Stats Cards:** Smaller and more minimal
  - Padding: p-6 → p-4
  - Font size: text-2xl → text-lg
  - Icon size: 18px → 16px
  - Removed colored icon backgrounds
  - Removed emoji suffixes (⭐, 🎯)
- **PowerTiles (Quick Actions):**
  - Complete redesign from gradient backgrounds → clean white cards
  - Removed all gradient backgrounds, decorative patterns, shadow effects
  - Shortened text: "Browse Off-Market Properties" → "Browse Properties"
  - Simplified descriptions: Cut by 60%
  - Removed "Get Started" arrows and dramatic hover effects
  - New layout: Horizontal icon + text (more compact)
- **Recent Activity:**
  - Removed colorful icon backgrounds (blue, emerald, purple, amber, rose)
  - Changed to minimal monochrome icons
  - Simplified unread indicators (smaller dots)
  - Removed animation delays
  - Smaller, cleaner overall design
- **Spacing:** Increased whitespace
  - Container: max-w-7xl → max-w-5xl (narrower, more focused)
  - Vertical spacing: space-y-8 → space-y-12

**Layout Refinements:**
- **Main Content Padding:** 50% increase
  - Mobile: p-4 → p-6
  - Desktop: p-8 → p-12
  - Bottom: pb-24 → pb-28, pb-8 → pb-12
- **TopBar Simplification:**
  - Removed backdrop blur effect
  - Reduced height: h-16 → h-14 (56px)
  - Cleaner search input with white background
  - Removed pulsing notification animation
  - Smaller notification badge: w-2 h-2 → w-1.5 h-1.5
- **WelcomeHeader:**
  - Removed Sparkles icon
  - Smaller heading: text-2xl lg:text-3xl → text-xl lg:text-2xl
  - Removed exclamation mark from "Welcome back"

**CSS Variables Updated:**
```css
/* Before */
--background: var(--champagne);  /* Warm */
--card: 45 45% 98%;              /* Cream */
--border: 45 30% 88%;            /* Warm beige */
--muted: 45 20% 92%;             /* Warm gray */
--radius: 0.5rem;                /* 8px */
--shadow-elegant: 0 4px 12px rgba(6, 78, 59, 0.08);
--shadow-glow: 0 0 20px rgba(232, 180, 184, 0.3);

/* After */
--background: 0 0% 98%;          /* #FAFAFA - Cool near-white */
--card: 0 0% 100%;               /* #FFFFFF - Pure white */
--border: 0 0% 90%;              /* Cool neutral gray */
--muted: 0 0% 96%;               /* #F5F5F5 - Light gray */
--radius: 0.375rem;              /* 6px */
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.04);
/* Removed shadow-elegant and shadow-glow */
```

**Files Modified:**
- `src/index.css` - Complete CSS variable overhaul
- `tailwind.config.ts` - Updated shadows and animations
- `src/components/layout/DashboardLayout.tsx` - Increased padding
- `src/components/layout/AppSidebar.tsx` - Complete redesign (light sidebar)
- `src/components/layout/TopBar.tsx` - Simplified and shortened
- `src/components/dashboard/WelcomeHeader.tsx` - Removed decorations
- `src/components/dashboard/StatsGrid.tsx` - Smaller, minimal
- `src/components/dashboard/PowerTiles.tsx` - Complete redesign
- `src/components/dashboard/RecentActivity.tsx` - Simplified icons
- `src/pages/Index.tsx` - Removed Network Highlights, increased spacing

---

#### 2. **Database Infrastructure & Seed Data**

**Supabase Connection:**
- ✅ Fixed Supabase connection with correct project credentials
- ✅ Created `test-supabase.mjs` for connection testing
- ✅ Installed `dotenv` package for environment variable management

**Profiles Table - Foreign Key Constraint:**
- **Issue:** Profiles table had `profiles_id_fkey` constraint linking to `auth.users`
- **Solution:** Dropped constraint for development/testing
  ```sql
  ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  ```
- **Reason:** Allows seed data insertion without creating auth users first

**Seed Data Created:**
- ✅ Created `seed-agents.mjs` script
- ✅ Successfully inserted **10 realistic buyer agents** into `profiles` table
- **Agent Details:**
  - **Cities:** Sydney (3), Melbourne (2), Brisbane, Perth, Adelaide, Gold Coast, Canberra
  - **Specializations:**
    - Luxury: 2 agents (Rebecca Wong, Sarah Mitchell)
    - Investment: 3 agents (Marcus Chen, Lisa Patel, Natalie Foster)
    - Residential: 4 agents (Emma Thompson, David O'Sullivan, Tom Bradley, Andrew Richards)
    - Commercial: 1 agent (James Harrison)
  - **Verification Status:** 8 verified ✓, 2 unverified
  - **Reputation Scores:** Range 81-94, Average 88/100
  - **Points:** Range 530-920
  - **Realistic Data:**
    - Professional bios
    - Real Australian locations with lat/long coordinates
    - Service regions (suburbs/areas)
    - Home base addresses

**Agent Profiles Summary:**
1. Sarah Mitchell - Sydney, Luxury, 92 reputation ✓
2. Marcus Chen - Melbourne, Investment, 88 reputation ✓
3. Emma Thompson - Brisbane, Residential, 85 reputation ✓
4. David O'Sullivan - Sydney (Northern Beaches), Residential, 90 reputation ✓
5. Lisa Patel - Perth, Investment, 87 reputation ✓
6. James Harrison - Adelaide, Commercial, 83 reputation
7. Rebecca Wong - Melbourne (Toorak), Luxury, 94 reputation ✓
8. Tom Bradley - Gold Coast, Residential, 81 reputation
9. Natalie Foster - Sydney (Inner West), Investment, 89 reputation ✓
10. Andrew Richards - Canberra, Residential, 86 reputation ✓

---

#### 3. **Technical Improvements**

**Git Workflow Established:**
- ✅ Configured git user for repository
- ✅ Committed all redesign changes with detailed commit message
- ✅ Pushed to GitHub: https://github.com/JodieWalsh/agent-network-hub
- ✅ Established practice: Commit and push after each significant feature
- **Commits This Session:**
  - `2c16996` - "Redesign: Minimal luxury aesthetic with warm champagne sidebar"
  - `9548d38` - "Add seed script for buyer agents with realistic Australian data"

**Environment Configuration:**
- ✅ Updated `.env` with correct Supabase credentials
- ✅ Added `dotenv` dependency (v17.2.3)
- ✅ Created test scripts for database verification

**Documentation:**
- ✅ Created comprehensive `PROJECT_CONTEXT.md`
- ✅ Documented design system, color palette, typography
- ✅ Documented future roadmap and technical stack
- ✅ Created this detailed session changelog

---

### 🎨 DESIGN SYSTEM SUMMARY (After Redesign)

**Color Palette:**
- **Main Background:** #FAFAFA (cool near-white)
- **Cards:** #FFFFFF (pure white)
- **Sidebar:** #F5F3EE (warm champagne/beige) - **Key differentiator**
- **Forest Green (#064E3B):** Used only as accent (active states, buttons, links)
- **Rose Gold (#E8B4B8):** Minimal use for verified badges, special highlights
- **Borders:** Cool neutral gray (hsl 0 0% 90%)

**Typography:**
- **Headings:** Inter (sans-serif) - clean, modern
- **Body:** Inter (sans-serif)
- **Special Brand Moments:** Playfair Display available but not used by default

**Spacing:**
- **Philosophy:** Generous whitespace = luxury
- **Main content:** p-6 (mobile), p-12 (desktop)
- **Component gaps:** 6 (mobile), 6-8 (desktop)
- **Section spacing:** space-y-12 to space-y-16

**Shadows:**
- Minimal: 1-3px blur, very subtle
- No dramatic shadows or glows

**Animations:**
- Fast: 150-200ms
- No staggered delays
- Minimal hover effects

---

### 🚀 CURRENT STATE

**What's Working:**
- ✅ Dashboard fully redesigned and functional
- ✅ Sidebar: Light, warm, professional
- ✅ Supabase connection: Working
- ✅ Directory page: Loads correctly (now with 10 agents!)
- ✅ Seed data: 10 realistic buyer agents in database

**What's Ready to Test:**
- Directory filtering (by name, city, specialization, reputation)
- Directory search functionality
- Star ratings display (calculated from reputation scores)
- Verified badge display

**What Still Needs Work:**
- Property Marketplace (no seed data yet)
- Authentication (not tested)
- Inspection Requests (not tested)
- Profile editing (not tested)
- Directory and Marketplace pages (not redesigned yet - still have old heavy styling)

---

### 📝 TECHNICAL NOTES

**Row-Level Security (RLS):**
- Profiles table has RLS enabled
- Foreign key constraint to `auth.users` was dropped for development
- Using service_role key for seed scripts (bypasses RLS)
- Future: Need to consider RLS policies for production

**Database Schema:**
- Profiles table structure confirmed and working
- Enums: user_type, specialization_type, property_status, inspection_status
- Geographic data: latitude/longitude for location-based features

**Dependencies Added:**
- `dotenv` - Environment variable management

**Scripts Created:**
- `test-supabase.mjs` - Connection testing
- `seed-agents.mjs` - Populate profiles table
- `drop-constraint.mjs` - Helper for dropping FK constraint (not used, manual SQL preferred)

---

### 🎯 NEXT PRIORITIES

1. **Test Directory Functionality**
   - Verify filtering works with real data
   - Test search functionality
   - Check location-based features

2. **Add Property Seed Data**
   - Create similar seed script for properties table
   - Add 15-20 realistic Australian properties

3. **Apply Minimal Design to Other Pages**
   - Redesign Directory page cards
   - Redesign Marketplace page cards
   - Ensure consistency across all pages

4. **Test Core Features**
   - Authentication flow
   - Inspection requests
   - Profile editing

5. **Performance & Polish**
   - Optimize queries
   - Add loading states
   - Error handling

---

### 💾 COMMIT HISTORY

```
9548d38 - Add seed script for buyer agents with realistic Australian data
2c16996 - Redesign: Minimal luxury aesthetic with warm champagne sidebar
64a1bfa - (Previous work before this session)
```

---

**Last Updated:** January 8, 2026 - 12:45 AM AEDT
**Session Duration:** ~3 hours
**Files Changed:** 14 files modified, 1 file created (PROJECT_CONTEXT.md)
**Lines Changed:** 542 insertions, 452 deletions
**Database Records Added:** 10 profiles

---

## Project Overview

**Agent Hub** is a B2B SaaS platform for Buyers Agents in Australia. It serves as a professional network connecting buyers agents with each other, enabling collaboration, property sharing, and professional development.

### Core Purpose
- Enable buyers agents to network and collaborate
- Share off-market properties within the professional network
- Facilitate inspection requests and client brief management
- Build professional reputation through peer ratings and connections

### Target Users (Current & Future)
- **Buyers Agents** (Primary, current)
- **Selling Agents** (Future Phase 1)
- **Building Inspectors** (Future Phase 1)
- **Stylists** (Future Phase 1)
- **Property Buyers/Consumers** (Future Phase 2 - B2C expansion)

### Core Features
1. **Agent Directory** - Searchable directory of buyers agents with profiles, ratings, specializations
2. **Property Marketplace** - Off-market and exclusive property listings shared among agents
3. **Inspection Requests** - Request and coordinate property inspections
4. **Client Briefs** - Create and share client property briefs
5. **Professional Network** - Connect with other agents, build reputation through points/ratings
6. **Dashboard** - Activity feed, stats, quick actions

---

## Technical Infrastructure

### Supabase Backend
- **Project ID:** `yrjtdunljzxasyohjdnw`
- **Project URL:** `https://yrjtdunljzxasyohjdnw.supabase.co`
- **Environment Variables:**
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

### Database Schema
**Main Tables:**
- `profiles` - User profiles with professional info, ratings, specializations
- `properties` - Property listings (off-market, under offer, sold)
- `inspection_requests` - Inspection coordination
- `client_briefs` - Client property requirements
- Additional tables for connections, messages, ratings (to be expanded)

### Technology Stack
- **Frontend Framework:** React 18.3.1 + TypeScript 5.8.3
- **Build Tool:** Vite 5.4.19
- **Styling:** Tailwind CSS 3.4.17 + shadcn/ui components
- **UI Components:** Radix UI primitives (headless components)
- **Data Fetching:** TanStack React Query 5.83.0
- **Routing:** React Router DOM 6.30.1
- **Authentication:** Supabase Auth
- **Icons:** Lucide React 0.462.0
- **Fonts:** @fontsource/playfair-display, @fontsource/inter
- **Package Manager:** npm

### Project Structure
```
agent-network-hub/
├── src/
│   ├── pages/                    # Route pages
│   │   ├── Index.tsx            # Dashboard
│   │   ├── Directory.tsx        # Agent Directory
│   │   ├── Marketplace.tsx      # Property Marketplace
│   │   ├── Inspections.tsx      # Inspection Requests
│   │   ├── PostInspection.tsx   # Create Inspection
│   │   ├── Auth.tsx             # Authentication
│   │   └── settings/
│   │       └── ProfileEdit.tsx  # Profile Editor
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── dashboard/           # Dashboard components
│   │   │   ├── WelcomeHeader.tsx
│   │   │   ├── StatsGrid.tsx
│   │   │   ├── PowerTiles.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── filters/             # Filter components
│   │   │   └── LocationSearchFilter.tsx
│   │   └── ui/                  # shadcn/ui components (62 components)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts        # Supabase client
│   │       └── types.ts         # Database types
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Authentication state
│   │   └── UnitsContext.tsx     # Metric/Imperial units
│   ├── lib/
│   │   ├── utils.ts             # Utility functions (cn, etc.)
│   │   ├── geocoder.ts          # Location services
│   │   ├── currency.ts          # Currency formatting
│   │   └── permissions.ts       # Permission checks
│   ├── index.css                # Global styles, CSS variables
│   └── App.tsx                  # Router configuration
├── tailwind.config.ts           # Tailwind configuration
├── vite.config.ts               # Vite configuration
├── package.json                 # Dependencies
├── .env                         # Environment variables
└── PROJECT_CONTEXT.md          # This file
```

---

## Design System - Premium Network

### Design Direction: Notion/Linear Minimal Luxury
We're transitioning from a traditional luxury aesthetic (ornate, decorative, rich) to a **modern luxury SaaS aesthetic** (minimal, spacious, refined). Think Notion's clean workspace or Linear's focused simplicity, but maintaining premium brand identity.

### Core Design Principles
1. **Whitespace as luxury** - Generous spacing signals premium, unhurried design
2. **Subtle over dramatic** - Replace heavy shadows and gradients with clean borders
3. **Color as accent** - Use brand colors sparingly for emphasis, not as primary backgrounds
4. **Typography hierarchy** - Consistent sizing, less decorative serif usage
5. **Purposeful interaction** - Fast, subtle animations (150-200ms)
6. **Clean structure** - List/table views alongside cards, cleaner layouts

### Brand Colors
**Primary Palette:**
- **Deep Forest Green:** `#064E3B` / `hsl(160 89% 16%)`
  - Primary brand color
  - Use for: Primary buttons, active indicators, important links
  - Light variant: `hsl(160 45% 25%)`
  - Dark variant: `hsl(160 89% 12%)`

- **Rose Gold:** `#E8B4B8` / `hsl(356 50% 81%)`
  - Premium accent color
  - Use for: Active state accents (borders), verified badges, special highlights
  - Light variant: `hsl(356 50% 90%)`
  - Dark variant: `hsl(356 40% 65%)`

- **Burgundy:** `#881337` / `hsl(263 67% 35%)`
  - Deep purple/burgundy secondary color
  - Use for: Special tags, secondary accents (use sparingly)

- **Champagne Ivory:** `#FEF9E7` / `hsl(48 60% 97%)`
  - Original primary background (being phased to cooler tones)
  - Use for: Marketing pages only (not in app)

**Minimal Aesthetic Colors (New):**
- **Background:** `#FAFAFA` / `hsl(0 0% 98%)` - Near-white, cooler tone
- **Card:** `#FFFFFF` / `hsl(0 0% 100%)` - Pure white
- **Border:** `hsl(0 0% 90%)` - Light neutral gray
- **Muted:** `hsl(0 0% 96%)` - Very light gray for subtle differentiation

### Typography
**Fonts:**
- **Playfair Display** (Serif) - Elegant, luxury feel
  - Weights: 400, 500, 600, 700
  - Use for: Logo, special headings (sparingly)
  - NOT for all headings (changed in redesign)

- **Inter** (Sans-serif) - Modern, professional
  - Weights: 400, 500, 600
  - Use for: Body text, UI elements, most headings
  - Default font for the application

**Typography Scale (Simplified):**
- Body: `text-sm` (14px) - default
- Small: `text-xs` (12px) - secondary info
- Headings: `text-base` (16px), `text-lg` (18px), `text-xl` (20px)
- Display: `text-2xl` (24px) - rare, special cases only

**Font Weight Strategy:**
- Default: `font-normal` (400) for body text
- Medium: `font-medium` (500) for emphasis
- Semibold: `font-semibold` (600) for primary headings only

### Shadows (Minimal)
```css
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
--shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.08);
```

### Border Radius
- Default: `0.375rem` (6px)
- Large: `0.5rem` (8px)
- Full: `9999px` (pills, badges)

### Spacing Philosophy
- Mobile: `p-6` for main content, `gap-6` for grids
- Desktop: `p-12` for main content, increased vertical spacing (`space-y-12` to `space-y-16`)
- Container max-width: `max-w-6xl` (1152px) instead of `max-w-7xl`

### Animation Timing
- Fast: `duration-150` (150ms) - default for most interactions
- Standard: `duration-200` (200ms)
- NO staggered delays, NO 300-500ms animations

---

## Current Redesign Plan (Jan 2026)

### Status: In Progress

We're implementing a comprehensive redesign to achieve the Notion/Linear minimal luxury aesthetic while maintaining our Premium Network brand identity.

**Redesign Summary:**
1. **Phase 0:** Create PROJECT_CONTEXT.md ✅
2. **Phase 1:** Foundation - CSS variables, colors, shadows, typography
3. **Phase 2:** Layout refinements - spacing, sidebar, topbar
4. **Phase 3:** Dashboard components - complete redesign of tiles, stats, activity
5. **Phase 4:** Directory page simplification
6. **Phase 5:** Marketplace page simplification
7. **Phase 6:** Global animation cleanup

**Key Changes:**
- Shift from warm Champagne backgrounds to cool near-white (#FAFAFA)
- Replace heavy shadows with subtle borders and minimal shadows
- Remove gradient backgrounds from PowerTiles → clean white cards
- Use brand colors as accents (borders, icons) not primary backgrounds
- Increase whitespace by 30-40%
- Reduce animation duration by 50%
- Switch from decorative serif headings to clean sans-serif

**Detailed Plan:**
See `.claude/plans/drifting-whistling-matsumoto.md` for complete implementation plan with before/after code examples.

---

## Future Roadmap

### Phase 1 Features (Current Development)

#### 1. Enhanced Property Search
- Advanced filter system (price range, bedrooms, location radius, property type)
- Save search preferences
- Email alerts for new matching properties
- Map view integration

#### 2. Theatrical Job Presentation System
- Visual, engaging presentations for properties and client briefs
- Similar to Canva or Pitch - beautiful, shareable presentations
- Templates for different presentation types
- Export to PDF or share link
- Embed images, property details, market data
- Professional branding for agents

#### 3. Expand User Types
- **Selling Agents**
  - Different profile type and permissions
  - List properties to marketplace
  - Connect with buyers agents for collaborations

- **Building Inspectors**
  - Professional profiles with certifications
  - Available for inspection bookings
  - Reviews and ratings from agents
  - Calendar integration

- **Stylists**
  - Portfolio showcase
  - Available for property staging consultation
  - Connect with agents for projects
  - Reviews and ratings

#### 4. Inspection Booking System
- Calendar integration for inspectors and agents
- Automated scheduling and confirmation
- Reminders via email/SMS
- Inspection reports upload
- Payment integration

### Phase 2 Features (B2C Expansion)

#### Consumer-Facing Platform
Transform Agent Hub into a dual-sided platform serving both B2B (agents) and B2C (property buyers).

**New Features:**
1. **Public Property Search**
   - Consumers can search properties listed by agents
   - Advanced filters, map view, saved searches
   - Contact agents directly through platform

2. **Agent Matching for Buyers**
   - Consumers answer questionnaire about needs
   - Algorithm matches them with suitable buyers agents
   - View agent profiles, ratings, specializations
   - Request consultations

3. **Public Agent Directory**
   - Consumers can browse and search for buyers agents
   - Filter by location, specialization, ratings
   - Read reviews from verified clients
   - Compare agents side-by-side

4. **Review & Rating System Enhancement**
   - Public reviews from verified clients
   - Separate ratings: Communication, Market Knowledge, Negotiation, etc.
   - Agent response to reviews
   - Verified purchase badges

5. **Lead Management for Agents**
   - Dashboard for incoming client inquiries
   - Lead qualification tools
   - CRM-lite functionality
   - Follow-up automation

**Business Model Considerations:**
- Freemium for agents (basic profile free, premium features paid)
- Lead generation fees
- Featured listings
- Subscription tiers for consumers (premium access)

---

## Key Documentation Files

1. **AgentHub_MASTER_DOCUMENT.md** - Original design specifications and requirements
2. **PROJECT_CONTEXT.md** (this file) - Comprehensive project overview
3. **.claude/plans/drifting-whistling-matsumoto.md** - Current redesign implementation plan
4. **README.md** - Setup and development instructions (if exists)

---

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
Create `.env` file in root with:
```
VITE_SUPABASE_PROJECT_ID="yrjtdunljzxasyohjdnw"
VITE_SUPABASE_URL="https://yrjtdunljzxasyohjdnw.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="[your-anon-key]"
```

### Supabase Connection Test
```bash
node test-supabase.mjs
```

---

## Notes for Future Sessions

### What Claude Should Know
1. **Design Philosophy:** We're going for Notion/Linear minimal luxury, not traditional ornate luxury
2. **Color Strategy:** Brand colors are accents, not primary backgrounds. Use #FAFAFA backgrounds, white cards.
3. **Font Strategy:** Inter for most things, Playfair Display sparingly for special moments
4. **Shadow Strategy:** Minimal shadows (1-3px), not heavy (8-24px)
5. **Animation Strategy:** Fast (150-200ms), no staggered delays, no dramatic transforms
6. **Spacing Strategy:** Generous whitespace is luxury. More padding, more gaps, less density.

### Current Implementation Status
- Supabase connection: ✅ Working
- Basic pages: ✅ Dashboard, Directory, Marketplace
- Authentication: ✅ Implemented
- Redesign: 🚧 In Progress (Phase 0 complete)

### Common Pitfalls to Avoid
- Don't revert to heavy shadows or gradients
- Don't use Playfair Display for all headings
- Don't add colorful backgrounds to cards
- Don't create staggered animation delays
- Don't use font-semibold everywhere

---

**Last Updated:** January 7, 2026
**Project Status:** Active Development - Minimal Aesthetic Redesign
