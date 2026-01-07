# Agent Hub - Project Context

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
