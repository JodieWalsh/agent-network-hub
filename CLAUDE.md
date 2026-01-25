# Claude Session Notes - Buyers Agent Hub

This file contains context and notes for Claude to remember across sessions.

---

## Session: 25 January 2026

### What Was Done

#### 1. Stripe Integration Setup (Complete)
- Installed Stripe packages: `@stripe/stripe-js` (frontend), `stripe` (backend via Edge Functions)
- Created `src/lib/stripe.ts` - Frontend Stripe client with:
  - Stripe.js initialization with publishable key
  - Checkout session helpers
  - Customer portal helpers
  - Connect onboarding helpers (for inspector payouts)
  - Subscription tier configuration with Price IDs

- Created Supabase Edge Functions in `supabase/functions/`:
  - `stripe-create-checkout/index.ts` - Creates checkout sessions
  - `stripe-create-portal/index.ts` - Creates customer portal sessions
  - `stripe-webhook/index.ts` - Handles all Stripe webhook events
  - `stripe-connect-onboarding/index.ts` - Inspector payout account setup
  - `stripe-connect-dashboard/index.ts` - Inspector earnings dashboard
  - `_shared/stripe.ts` - Shared utilities (Stripe client, CORS, helpers)

- Created database migration: `supabase/migrations/20260125010000_add_stripe_fields_to_profiles.sql`
  - Added: stripe_customer_id, subscription_status, subscription_tier, subscription_current_period_end
  - Added: stripe_connect_account_id, stripe_connect_onboarding_complete

- Created `.env.local` with actual Stripe API keys (gitignored)
- Updated `.env` with placeholder Stripe keys
- Updated `README.md` with Stripe setup instructions
- Deployed all Edge Functions to Supabase with secrets set

#### 2. Stripe Price IDs Configured
These are the actual Stripe Price IDs in the sandbox:

| Tier | Monthly | Annual |
|------|---------|--------|
| Basic ($29/mo) | `price_1StGZQCnDmgyQa6dz7mrD80L` | `price_1StGkDCnDmgyQa6dJOcQ0SDP` |
| Premium ($79/mo) | `price_1StGaACnDmgyQa6dhp2qJsO0` | `price_1StGkpCnDmgyQa6dI4aYmsVQ` |

Annual pricing: ~17% discount ($290/yr for Basic, $790/yr for Premium)

#### 3. Pricing Page Created (`src/pages/Pricing.tsx`)
- Clean, professional design matching the app style
- Monthly/Annual billing toggle with "Save 17%" badge
- 3 pricing cards: Free, Basic (Most Popular), Premium
- Trust section with icons (Secure Payments, Trusted by Professionals, Cancel Anytime)
- Collapsible FAQ section with 6 questions
- Full Stripe Checkout integration
- Success/Cancel URL param handling with toast notifications
- Current plan detection with "Current Plan" badge and renewal countdown
- "Manage Subscription" button for existing subscribers via Stripe Customer Portal
- Added route `/pricing` to `App.tsx`
- Added "Pricing" nav item to sidebar (`AppSidebar.tsx`)

#### 4. Guest Subscription Flow Fixed
When a non-logged-in user clicks "Subscribe":
1. Stores selected plan in sessionStorage
2. Redirects to `/auth?mode=signup&plan=basic&billing=annual`
3. Auth page shows "Welcome" (not "Welcome Back") with message about subscribing
4. After sign up, redirects to `/pricing`
5. Auto-triggers Stripe Checkout
6. Shows "Continue subscription" banner if checkout dismissed

Files modified:
- `src/pages/Pricing.tsx` - Added pending plan handling, sessionStorage, auto-checkout
- `src/pages/Auth.tsx` - Added URL param handling, mode-based UI, redirect logic

### Commits Made
1. `47992e1` - feat: add clean subscription pricing page with Stripe Checkout
2. `a71562e` - chore: add Stripe environment variable placeholders to .env
3. `6410fbc` - fix: redirect to sign up page when subscribing as guest

### Previous Session Work (from context summary)
- Implemented escrow payment workflow for inspection marketplace
- Added fee transparency and disclaimers throughout inspection workflow
- Added items #17 (Escrow) and #18 (Stripe & Business Setup) to DANI_APPROVAL_CHECKLIST.md

---

## Key Files Reference

### Stripe Integration
- `src/lib/stripe.ts` - Frontend Stripe client and tier config
- `supabase/functions/_shared/stripe.ts` - Backend shared utilities
- `supabase/functions/stripe-*/index.ts` - Individual Edge Functions
- `.env.local` - Actual API keys (gitignored)

### Subscription Flow
- `src/pages/Pricing.tsx` - Pricing page with Stripe Checkout
- `src/pages/Auth.tsx` - Auth page with signup mode handling

### Documentation
- `docs/DANI_APPROVAL_CHECKLIST.md` - Business decisions needing approval
- `docs/TECHNICAL_DOCUMENTATION.md` - Architecture reference
- `README.md` - Setup instructions including Stripe

---

## Platform Fee Structure
- **Inspection Marketplace:** 10% platform fee (inspector gets 90%)
- **Subscriptions:** Basic $29/mo, Premium $79/mo (17% discount for annual)

---

## Environment Variables Needed
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

For Supabase Edge Functions, set secrets:
```sh
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```
