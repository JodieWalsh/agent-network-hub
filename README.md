# Buyers Agent Hub

A professional networking platform connecting buyers agents, real estate agents, inspectors, and other property professionals.

## 📋 Project Documentation

Before making changes, please read the documentation:

| Document | Description |
|----------|-------------|
| [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) | Architecture, features, database, key files reference |
| [Key Features](docs/KEY_FEATURES.md) | Platform features and how they work |
| [Dani's Approval Checklist](docs/DANI_APPROVAL_CHECKLIST.md) | Business decisions needing review |
| [Project To-Do List](docs/PROJECT_TODO.md) | Future development tasks |

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn-ui
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **Payments:** Stripe (Subscriptions, Connect for marketplace payouts)
- **Location:** Mapbox Geocoding API

## Getting Started

### Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase project with required tables
- Mapbox access token

### Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd agent-network-hub

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Migrations

Push migrations to Supabase:

```sh
npx supabase db push
```

### Stripe Setup (Payments)

Stripe is used for:
- **Subscriptions:** Monthly/annual plans for premium features
- **Marketplace Payments:** Paying inspectors via Stripe Connect (90% to inspector, 10% platform fee)
- **Invoices:** Automatic tax invoices for all transactions

#### 1. Get Stripe API Keys

1. Create a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com/register)
2. Go to **Developers > API Keys** (use Test mode for development)
3. Copy your keys:
   - **Publishable key:** `pk_test_xxx` (safe for frontend)
   - **Secret key:** `sk_test_xxx` (backend only!)

#### 2. Add Keys to Environment Variables

Add these to your `.env` file:

```sh
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_xxx"
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

#### 3. Set Up Webhooks for Local Development

Use the Stripe CLI to forward webhooks to your local Edge Functions:

```sh
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login to your Stripe account
stripe login

# Forward webhooks to your local Supabase
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Copy the webhook signing secret (whsec_xxx) to your .env
```

#### 4. Set Up Webhooks for Production

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `account.updated` (for Connect)
4. Copy the signing secret to your Supabase Edge Function environment variables

#### 5. Deploy Edge Functions

```sh
# Deploy all Stripe functions
supabase functions deploy stripe-create-checkout
supabase functions deploy stripe-create-portal
supabase functions deploy stripe-webhook
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-connect-dashboard

# Set secrets for Edge Functions
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### 6. Create Products & Prices (TODO)

In Stripe Dashboard, create:
- **Basic Plan:** Monthly ($29) and Annual ($290)
- **Premium Plan:** Monthly ($79) and Annual ($790)

Update the Price IDs in `src/lib/stripe.ts` → `SUBSCRIPTION_TIERS`.

## Key Features

- **Agent Directory** - Find and connect with property professionals
- **Inspection Spotlights** - Post jobs for property inspections
- **Bid System** - Transparent bidding with full audit trail
- **My Posted Jobs** - Manage inspection requests and review bids
- **Client Briefs** - Track buyer requirements and property searches
- **Property Marketplace** - Share off-market properties
- **Admin Dashboard** - User approval and platform management

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── auth/        # Authentication components
│   ├── layout/      # Layout components (Sidebar, Header)
│   ├── location/    # Location search components
│   └── ui/          # shadcn-ui components
├── contexts/        # React contexts (Auth, Units)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and helpers
├── pages/           # Page components
│   ├── inspections/ # Inspection-related pages
│   └── settings/    # Settings pages
└── integrations/    # External service integrations

docs/                # Documentation
supabase/
└── migrations/      # Database migrations
```

## User Roles

| Role | Access Level |
|------|--------------|
| Guest | Limited - browsing only, awaiting approval |
| Verified Professional | Full - all platform features |
| Admin | Full + platform management |

## Testing Multiple Users

To test flows involving two users (e.g., job poster and bidder):

1. **Different browsers:** Chrome for User A, Firefox/Edge for User B
2. **Incognito window:** Regular window for User A, Incognito for User B

## Deployment

This project uses Lovable for deployment. Open the Lovable dashboard and click Share → Publish.

## Contributing

1. Read the [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)
2. Check existing patterns in the codebase
3. Follow TypeScript and React best practices
4. Test with multiple user roles

---

*Last updated: January 2026*
