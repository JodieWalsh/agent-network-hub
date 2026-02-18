# Claude Session Notes - Buyers Agent Hub

This file contains context and notes for Claude to remember across sessions.
Read this first before doing any work on this project.

---

## Platform Overview

**Buyers Agent Hub** (repo: `agent-network-hub`) is a professional networking marketplace for property professionals. Originally Australian-focused, now supports international users across 33 countries with multi-currency support. It connects buyers agents, real estate agents, building inspectors, conveyancers, mortgage brokers, and stylists.

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui component library + Tailwind CSS (custom `forest` green theme colour)
- **Backend:** Supabase (Auth, PostgreSQL, Real-time, Storage, Edge Functions)
- **Geospatial:** PostGIS + Mapbox Geocoding API
- **Payments:** Stripe (subscriptions + Connect for inspector payouts + marketplace escrow)
- **Hosting:** Vercel (frontend) + Supabase (backend/Edge Functions)

### Key User Types (stored as `user_type` on profiles)
`buyers_agent`, `real_estate_agent`, `building_inspector`, `conveyancer`, `mortgage_broker`, `stylist`

---

## Project Structure

```
src/
  components/
    auth/              ProtectedRoute
    client-brief/      BriefLocationManager
    dashboard/         StatsGrid, PowerTiles, WelcomeHeader, RecentActivity
    directory/         ProfileDetailModal
    filters/           LocationSearchFilter
    layout/            DashboardLayout, TopBar, AppSidebar, BottomNav
    location/          LocationSearch
    marketplace/       PropertyGallery, PropertyMap, PropertyDetailModal
    messaging/         NewMessageModal
    notifications/     NotificationBell
    profile/           AvatarUpload, ServiceAreaManager, ApplyForProfessionalButton
    property/          ImageUpload, PropertyAddressSearch, PriceInput
    ui/                shadcn components + custom (currency-badge, role-badge, verified-badge, trust-tip-banner, unit-toggle)
  contexts/
    AuthContext.tsx                    Auth state provider (includes stripe_connect fields on Profile)
    UnitsContext.tsx                   Imperial/metric unit preferences
    MessageNotificationContext.tsx     Unread count, toast/browser notifications
  lib/
    currency.ts          Multi-currency formatting (30+ currencies, 33 countries)
    geocoder.ts          Legacy geocoder
    mapbox-geocoder.ts   Mapbox geocoding integration
    messaging.ts         Full messaging API (752 lines) - see Messaging section
    notifications.ts     Notification system (811 lines) - see Notifications section
    permissions.ts       Role-based permission system
    storage.ts           Supabase storage helpers
    stripe.ts            Stripe client, checkout, portal, Connect onboarding, payouts
    utils.ts             Tailwind cn() utility
  pages/
    Index.tsx                    Dashboard home
    Auth.tsx                     Login/signup with plan redirect
    Welcome.tsx                  Onboarding wizard
    Admin.tsx                    Admin panel (user approval, property review)
    Messaging.tsx                Full messaging UI (1,293 lines)
    Directory.tsx                Professional directory with message buttons
    Marketplace.tsx              Property listings
    AddProperty.tsx              Property submission form
    Pricing.tsx                  Subscription plans with Stripe Checkout
    Activity.tsx                 Activity feed
    ClientBriefs.tsx             Client brief listing
    ClientBriefForm.tsx          Client brief creation
    ClientBriefDetail.tsx        Client brief detail view
    Inspections.tsx              Inspection hub/router
    InspectionSpotlights.tsx     Job board for inspectors
    InspectionSpotlightDetail.tsx  Single job detail with bidding + fee transparency
    PostInspection.tsx           Post-inspection job form
    CreateInspectionJob.tsx      Create inspection job (multi-step with escrow payment)
    InspectionReportBuilder.tsx  Inspector report submission
    InspectionReportView.tsx     Report viewer + approval triggers payout
    ResetPassword.tsx            Password reset
    NotFound.tsx                 404
    settings/
      ProfileEdit.tsx            Profile settings
      Billing.tsx                Subscription management + Inspector payout setup + My Earnings
      ConnectReturn.tsx          Stripe Connect onboarding return handler
    inspections/
      MyPostedJobs.tsx           Jobs I've posted (buyer agent view) + payment breakdown
      MyInspectionWork.tsx       Jobs I'm working on (inspector view) + earnings tracking
supabase/
  functions/
    stripe-create-checkout/      Creates Stripe Checkout sessions
    stripe-create-portal/        Customer portal (manage subscription)
    stripe-webhook/              Handles all webhook events (subscriptions + Connect)
    stripe-connect-onboarding/   Inspector payout account setup via Connect Express
    stripe-connect-dashboard/    Inspector earnings dashboard (Express Dashboard link)
    stripe-connect-payout/       Trigger payout to inspector after report approval
    _shared/stripe.ts            Shared Stripe client + CORS + calculateFees() + helpers
  migrations/                    ~60 migration files (see Database section)
docs/
  TECHNICAL_DOCUMENTATION.md     Architecture reference
  KEY_FEATURES.md                Feature list
  COMMUNICATION_SYSTEM_PLAN.md   Messaging system design doc
  PROJECT_TODO.md                Outstanding work items
  DANI_APPROVAL_CHECKLIST.md     Business decisions needing stakeholder approval
```

---

## Stripe Connect - Inspector Payouts (Built 27 Jan 2026)

### How Inspector Payouts Work

The platform takes a 10% fee on every inspection job. When a buyer's agent approves an inspection report, the inspector receives 90% of the agreed price via Stripe Connect.

```
Job Posted (escrow payment) -> Inspector Completes Report -> Agent Approves Report
  -> createConnectPayout(jobId) Edge Function fires
  -> Stripe Transfer to inspector's Connect account (90%)
  -> Platform retains 10% fee
  -> Webhook creates notification for inspector
```

### Inspector Onboarding Flow

1. Inspector visits `/settings/billing` -> "Set Up Payouts" card
2. `createConnectOnboardingLink(userId)` -> Stripe Connect Express onboarding
3. Stripe redirects to `/settings/connect-return?success=true`
4. `ConnectReturn.tsx` checks `stripe_connect_onboarding_complete` on profile
5. Redirects to `/settings/billing` with success toast

### Payout States on `inspection_jobs`
- `payout_status`: `null` -> `pending` (inspector not onboarded) | `processing` -> `paid` | `failed`
- `payout_amount`: Amount in cents sent to inspector
- `payout_transfer_id`: Stripe Transfer ID
- `payout_completed_at`: Timestamp

### Payout Gating at Job Assignment (Option C - Built 28 Jan 2026)

When a poster accepts a bid and pays via Stripe Checkout, the webhook checks if the inspector has completed Stripe Connect onboarding:

- **Inspector onboarded:** Job status → `assigned`, notifications sent (`bid_accepted`, `payment_confirmed`)
- **Inspector NOT onboarded:** Job status → `pending_inspector_setup`, notifications sent (`payout_setup_required` to inspector, `awaiting_inspector_setup` to poster)

When the inspector completes onboarding (`account.updated` webhook):
1. Queries `inspection_jobs` with `status=pending_inspector_setup AND assigned_inspector_id=userId`
2. Transitions each job to `assigned`
3. Sends `job_assigned` notification to inspector
4. Sends `inspector_assigned` notification to poster
5. Also retries any pending payouts (existing logic)

Key columns: `accepted_bid_id UUID` (tracks which bid was accepted before full assignment)

UI:
- **MyPostedJobs:** Shows "Awaiting Inspector Setup" badge and message for `pending_inspector_setup` jobs
- **MyInspectionWork:** Shows amber "Set Up Payouts" CTA for `pending_inspector_setup` jobs in Accepted tab
- **InspectionSpotlightDetail:** Poster sees "Waiting for inspector to complete payout setup"; inspector sees "Set Up Payouts" button

### Edge Functions for Connect
| Function | Purpose |
|----------|---------|
| `stripe-connect-onboarding` | Creates Express account + onboarding link, redirects to `/settings/connect-return` |
| `stripe-connect-dashboard` | Generates Express Dashboard login link |
| `stripe-connect-payout` | Creates Stripe Transfer after report approval. Validates job state, calculates 90%, creates transfer, updates DB |

### Fee Calculation (`_shared/stripe.ts`)
```typescript
PLATFORM_FEE_PERCENT = 10;
calculateFees(amount) -> { platformFee, inspectorPayout, totalAmount }
// amount=500 -> platformFee=50, inspectorPayout=450
```

### Billing Page Sections (for inspectors)
1. **Payout Setup Card** - Three states:
   - Not started: "Set Up Payouts" button
   - Incomplete: "Continue Setup" button
   - Connected: green badge + "Manage Payouts" -> Express Dashboard
2. **My Earnings Card** - Fetches completed jobs, shows:
   - Total earned (all time, 90% amounts)
   - Pending payouts count
   - Recent jobs with payout status badges

### Profile Fields for Connect
```typescript
stripe_connect_account_id: string | null;
stripe_connect_onboarding_complete: boolean;
```

### ConnectReturn Page (`/settings/connect-return`)
Handles Stripe redirect after onboarding:
- `?success=true` -> Refresh profile, check onboarding complete, auto-redirect to billing
- `?refresh=true` -> Session expired, show "Continue Setup" button
- Pending verification -> "Stripe is verifying your account" message

### Payout Trigger on Report Approval
In `InspectionReportView.tsx`, `handleApproveReport()` calls `createConnectPayout(job.id)` after updating job status. Three outcomes:
- `paid` -> "Payment released to inspector!"
- `pending_onboarding` -> "Inspector will be paid once they complete payout setup"
- Error -> Non-blocking toast (approval still succeeds)

---

## Fee Transparency Messaging (Built 27 Jan 2026)

The 90%/10% fee split is shown at every stage of the payment flow:

| Location | What's Shown | File |
|----------|-------------|------|
| **Job posting (Step 3: Budget)** | Live breakdown as poster types budget: "Inspector receives (90%): $X / Platform fee (10%): $X" | `CreateInspectionJob.tsx` |
| **Job posting (Step 4: Payment)** | Payment summary with fee breakdown + "Pay $X - Secure Escrow" button | `CreateInspectionJob.tsx` |
| **Job posting (Step 5: Review)** | Final summary with fee breakdown + escrow info | `CreateInspectionJob.tsx` |
| **Bid submission dialog** | Live earnings breakdown: "You receive (90%): $X / Platform fee (10%): $X" | `InspectionSpotlightDetail.tsx` |
| **Job detail (poster view)** | Status card: "Payment required" / "$X in escrow" / "Payment complete - $X sent to inspector" | `InspectionSpotlightDetail.tsx` |
| **Job detail (inspector view - open)** | "Your Earnings" card: budget, fee %, "You'll receive: $X" | `InspectionSpotlightDetail.tsx` |
| **Job detail (inspector view - assigned)** | "$X will be released when your report is approved" (amber) | `InspectionSpotlightDetail.tsx` |
| **Job detail (inspector view - completed)** | "$X has been sent to your account" (green) | `InspectionSpotlightDetail.tsx` |
| **My Posted Jobs cards** | Active: "$X in escrow" / Completed: "Inspector paid $X" | `MyPostedJobs.tsx` |
| **My Posted Jobs completed tab** | Full breakdown: Job Total, Inspector Payment (90%), Platform Fee (10%), payout status badge | `MyPostedJobs.tsx` |
| **My Inspection Work - Bids** | "You'll earn $X if selected (10% platform fee)" | `MyInspectionWork.tsx` |
| **My Inspection Work - Submitted** | "$X pending" (90% net) + "Awaiting Approval" badge | `MyInspectionWork.tsx` |
| **My Inspection Work - Completed** | "$X earned" (90% net) + fee breakdown | `MyInspectionWork.tsx` |
| **My Inspection Work - Stats** | Total earned calculated at 90% net | `MyInspectionWork.tsx` |
| **Accepted jobs** | "Your earnings: $X (after 10% platform fee)" | `MyInspectionWork.tsx` |

### Styling Convention
- **Green** (`text-green-700`, `bg-green-50`) for completed/paid states
- **Amber** (`text-amber-700`, `bg-amber-50`) for pending/escrow states
- **Subtle secondary text** for fee details (never overwhelming)
- `DollarSign` icon from lucide-react for payment indicators

---

## Multi-Currency Support (Built 28 Jan 2026)

The platform supports international users with multi-currency job posting and payment processing. The poster's profile currency determines the job currency. Stripe handles cross-border conversion for inspector payouts automatically.

### How It Works
1. **User sets country/currency** in Profile Settings → stored as `profiles.country_code` + `profiles.default_currency`
2. **Job posting** reads `profile.default_currency` → stored as `inspection_jobs.budget_currency`
3. **All displays** use `formatPrice(amount, job.budget_currency || 'AUD')` from `src/lib/currency.ts`
4. **Stripe Checkout** charges in the job's currency: `currency: (job.budget_currency || 'AUD').toLowerCase()`
5. **Stripe Transfer** pays inspector in the job's currency; Stripe converts to their local currency
6. **Cross-currency note** shown to inspectors when job currency differs from their profile currency

### Database Columns
- `profiles.country_code TEXT DEFAULT 'AU'` — user's country
- `profiles.default_currency TEXT DEFAULT 'AUD'` — user's preferred currency
- `inspection_jobs.budget_currency TEXT DEFAULT 'AUD'` — job's currency (already existed)
- `inspection_payments.currency TEXT DEFAULT 'AUD'` — payment record currency (already existed)

### Currency Library: `src/lib/currency.ts` (key functions)
| Function | Purpose |
|----------|---------|
| `formatPrice(amount, currencyCode)` | Format dollar amount → `$500.00` or `£300.00` |
| `formatPriceWithCode(amount, currencyCode)` | Format with code → `$500.00 AUD` |
| `getCurrency(code)` | Get currency object (symbol, name, locale) |
| `getCurrencyForCountry(countryCode)` | Country → currency mapping (e.g., `US` → `USD`) |
| `getAllCurrencies()` / `getPopularCurrencies()` | Currency lists for dropdowns |

### Files Modified for Multi-Currency
| File | Changes |
|------|---------|
| `ProfileEdit.tsx` | Country + currency dropdowns, auto-suggest currency from country |
| `CreateInspectionJob.tsx` | Budget input uses profile currency, `budget_currency` saved to job |
| `InspectionSpotlightDetail.tsx` | All prices use `formatPrice()` + cross-currency note |
| `InspectionSpotlights.tsx` | Job card prices use `formatPrice()` |
| `MyPostedJobs.tsx` | All bid/escrow/payment displays use `formatPrice()` |
| `MyInspectionWork.tsx` | All earnings/bid displays use `formatPrice()` + cross-currency note |
| `InspectionReportView.tsx` | Payment amounts use `formatPrice()` |
| `InspectionReportBuilder.tsx` | Earnings display uses `formatPrice()` |
| `PayoutSetup.tsx` | Pending job amounts use `formatPrice()` |
| `accept-bid-with-payment/index.ts` | Checkout currency from job |
| `stripe-connect-payout/index.ts` | Transfer + payment record currency from job |
| `stripe-webhook/index.ts` | Escrow, retry payouts, notifications all use job currency |

### Supported Countries (33)
AU, US, GB, CA, NZ, IE, DE, FR, ES, IT, NL, BE, AT, CH, SE, NO, DK, FI, PT, PL, CZ, HU, RO, BG, HR, GR, SG, HK, JP, MY, TH, MX, BR

---

## Messaging System (Built 25-26 Jan 2026)

The messaging system is the most complex feature in the codebase. It was built in 6 phases across multiple sessions.

### Architecture Overview

```
User clicks "Message" anywhere in app
  -> getOrCreateConversation() RPC call
  -> Navigate to /messages?conversation={id}
  -> Real-time subscription for new messages
  -> Broadcast channels for typing/read receipts
  -> Presence channel for online status
```

### Phase 1: Core Messaging
**Commit:** `c9473c6` + fixes `076f5fc` through `0598b4b`

- **Database tables:** `conversations`, `conversation_participants`, `messages`
- **RLS policies:** Users can only access conversations they participate in
- **RPC functions** (SECURITY DEFINER to bypass RLS):
  - `create_conversation(other_user_id)` - Create or find 1:1 conversation
  - `send_message(conversation_id, content)` - Send with validation
  - `mark_conversation_read(conversation_id)` - Update `last_read_at`
  - `get_user_conversations()` - List all conversations with last message + unread count
  - `get_conversation_details(conversation_id)` - Single conversation info
  - `search_users(query)` - Find users by name
  - `get_unread_message_count()` - Total unread across all conversations
- **Real-time:** `postgres_changes` subscription on messages table
- **UI:** Two-panel layout (conversation list + message view), mobile responsive

### Phase 2: Typing, Read Receipts, Presence
**Commit:** `17d0479`

- **Typing indicators:** Broadcast channel per conversation, debounced to 2s, auto-hide after 3s
- **Read receipts:** Double-check marks (grey = sent, teal = read), broadcast on conversation open
- **Online presence:** Supabase Presence channel, green dot on avatars
- **`setupConversationChannel()`** returns `{ sendTyping, sendReadReceipt, cleanup }`
- **`setupPresenceChannel()`** tracks who's online across the app

### Phase 3: App-Wide Integration + Notifications
**Commit:** `35723bb`

- **Message buttons added to:**
  - `Directory.tsx` - "Message" button on each professional's profile
  - `InspectionSpotlightDetail.tsx` - Message bidders/inspectors (job-linked)
  - `MyPostedJobs.tsx` - Message bidders from bid cards and dialogs
  - `MyInspectionWork.tsx` - Message job creators from accepted jobs
- **`MessageNotificationContext`** (162 lines):
  - Global unread count badge on sidebar nav
  - Toast notifications (suppressed for active conversation)
  - Browser notifications (when tab is hidden, click to navigate)
  - Database notification records via `notifyNewMessage()`
  - Real-time subscription to all new messages
- **`NotificationBell`** component with dropdown panel

### Phase 4: File Attachments
**Commit:** `12e09ee`

- **Storage:** Private `message-attachments` bucket with RLS
- **Allowed types:** JPEG, PNG, GIF, WebP, PDF, DOC/DOCX, XLS/XLSX, TXT (max 10MB)
- **Upload flow:** `validateAttachment()` -> `uploadAttachment()` -> signed URL (1-year expiry)
- **UI:** Paperclip button, attachment preview strip, inline image display, document download cards, image lightbox modal
- **Message columns added:** `attachment_url`, `attachment_type`, `attachment_name`, `attachment_size`

### Phase 5: Job-Linked Contextual Conversations
**Commit:** `d20aa4c`

- **Conversation columns added:** `job_id` (FK to `inspection_jobs`, ON DELETE SET NULL), `title`, `context_type`
- **Context types:** `'general'` (default), `'inspection_job'` (linked to a job), `'custom'` (user-titled)
- **Deduplication logic in `create_conversation()` RPC:**
  - Job-linked: Matches on `job_id` between same two users
  - General: Matches on `job_id IS NULL AND context_type = 'general'`
  - Custom: Always creates new (no dedup)
- **`getOrCreateConversation(userId1, userId2, options?)`** accepts `{ jobId?, title?, contextType? }`
- **Conversation list shows:** Briefcase icon + job title for job-linked, MessageSquare icon + topic for custom
- **Conversation header:** Clickable job title (navigates to job detail), "Job no longer available" for deleted jobs
- **Pre-fill messages:** URL param `?prefill=Hello%20about%20the%20job` auto-populates input
- **Auto-generated titles:** `'Re: ' || property_address` for job conversations

### Phase 6: Custom-Titled Conversations
**Commit:** `aec41bc`

- **New Message Modal rewritten** as two-step flow:
  1. Search and select a user
  2. Optional "Conversation Topic" field -> "Start Topic" / "Start Conversation"
- **"+ New Topic" button** in conversation header: Opens modal pre-filled with current other participant, skips to step 2
- **`preselectedUser` prop** on `NewMessageModal` for the header button flow
- **RPC change:** When `p_context_type = 'custom' AND p_title IS NOT NULL`, skip existing conversation lookup entirely

### Key Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/messaging.ts` | 752 | All messaging API functions, types, real-time subscriptions |
| `src/pages/Messaging.tsx` | 1,293 | Full messaging UI with all features |
| `src/components/messaging/NewMessageModal.tsx` | 328 | Two-step new message/topic modal |
| `src/contexts/MessageNotificationContext.tsx` | 162 | Global notification provider |

### Database Migrations (Messaging)
```
20260125020000_add_messaging_system.sql           Core tables + RLS
20260125020001_enable_realtime_messages.sql        Enable Realtime
20260125020002_fix_messaging_rls_policies.sql      RLS fixes
20260125020003_simplify_messaging_rls.sql          Simplify RLS (circular ref fix)
20260125020004_add_messaging_functions.sql         RPC functions
20260125020005_fix_messaging_functions.sql         RPC fixes
20260125020006_fix_user_type_cast.sql              Cast user_type enum to TEXT
20260126010000_add_suburb_to_messaging_functions.sql  Add home_base_address to RPCs
20260126020000_add_other_last_read_at.sql          Read receipt support
20260126030000_add_new_message_notification_type.sql  'new_message' notification type
20260126040000_add_message_attachments.sql         Attachment columns + storage bucket
20260126050000_add_job_linked_conversations.sql    job_id, title, context_type + RPC rewrites
20260126060000_support_custom_topic_conversations.sql  Custom topic dedup bypass
```

### Exported Types from `src/lib/messaging.ts`
```typescript
Participant          // { id, full_name, avatar_url, user_type, home_base_address }
Message              // { id, conversation_id, sender_id, content, created_at, sender?, attachment_* }
MessageAttachment    // { url, type, name, size }
Conversation         // Full conversation with metadata
ConversationWithOther // Conversation + other_participant derived field
ConversationOptions  // { jobId?, title?, contextType? }
ConversationChannelHandle // { sendTyping, sendReadReceipt, cleanup }
```

### Exported Functions from `src/lib/messaging.ts`
```
getConversations(userId)                              List conversations
getConversationDetails(conversationId)                Single conversation details
getOrCreateConversation(userId1, userId2, options?)    Get or create conversation
getMessages(conversationId, limit?, offset?)          Paginated messages
sendMessage(conversationId, senderId, content, attachment?)  Send message
markConversationRead(conversationId, userId)           Mark as read
searchUsers(query, currentUserId, limit?)              Search users by name
getUnreadCount(userId)                                 Total unread count
subscribeToMessages(conversationId, callback)          Real-time messages
subscribeToConversationUpdates(userId, callback)       Conversation list updates
subscribeToAllNewMessages(userId, callback)            All messages (notifications)
setupConversationChannel(convId, userId, callbacks)    Typing + read receipts
setupPresenceChannel(userId, onSync)                   Online presence
uploadAttachment(file, userId)                         Upload file to storage
validateAttachment(file)                               Validate type/size
isImageFile(mimeType)                                  Check if image
getAttachmentIconName(mimeType)                        Icon name for file type
formatFileSize(bytes)                                  Human-readable file size
```

---

## Notification System

### `src/lib/notifications.ts` (811 lines)

**Notification types:** `bid_received`, `bid_accepted`, `bid_declined`, `bid_edited`, `job_assigned`, `report_submitted`, `report_approved`, `payment_released`, `payment_confirmed`, `payment_refunded`, `payout_setup_required`, `awaiting_inspector_setup`, `inspector_assigned`, `review_received`, `badge_earned`, `job_expired`, `job_cancelled`, `new_message`, `user_approved`, `user_rejected`, `user_promoted_admin`, `job_posted_nearby`

**Multi-channel delivery:**
- In-app database records (permanent history)
- Toast notifications (immediate UI)
- Browser notifications (when tab hidden)
- Email/SMS framework defined but not yet active

**Key functions:** `createNotification()`, `fetchNotifications()`, `getUnreadCount()`, `markAsRead()`, `markAllAsRead()`, `notifyNewMessage()`

**Preferences:** Per-user notification preferences table with quiet hours and timezone support.

### `src/components/notifications/NotificationBell.tsx` (267 lines)
- Bell icon with unread count badge
- Dropdown with last 10 notifications
- Mark as read (single + all)
- 30-second polling
- Click to navigate

### Area-Based Job Notifications (Built 28 Jan 2026)

When a new inspection job is posted, nearby inspectors are automatically notified so they can bid.

**How it works:**
1. User posts a job in `CreateInspectionJob.tsx`
2. POST returns the created job record (uses `'Prefer': 'return=representation'`)
3. Non-blocking `fetch` calls `notify_nearby_inspectors(p_job_id)` RPC
4. RPC finds all approved users whose service areas cover the job location
5. Creates `job_posted_nearby` notification for each matching inspector
6. Inspector sees blue MapPin notification in NotificationBell → clicks to navigate to job detail

**6 Matching Strategies** (in `notify_nearby_inspectors` RPC):
1. **Radius service area** — `ST_DWithin(sa.center_point, job.property_location, sa.radius_km * 1000)`
2. **Global service area** — matches all jobs
3. **Region name** — `job.property_address ILIKE '%' || sa.region_name || '%'`
4. **State name** — `job.property_address ILIKE '%' || sa.state_name || '%'`
5. **Country name** — `job.property_address ILIKE '%' || sa.country_name || '%'`
6. **Home proximity** — inspector's home lat/lng within 5km of job (`ST_DWithin` with 5000m)

**Files:**
| File | What |
|------|------|
| `supabase/migrations/20260128040000_add_job_posted_nearby_notifications.sql` | CHECK constraint + RPC function |
| `src/lib/notifications.ts` | Added type, icon (MapPin), color (blue), route |
| `src/components/notifications/NotificationBell.tsx` | Added MapPin icon mapping |
| `src/pages/CreateInspectionJob.tsx` | Calls RPC after job creation (non-blocking) |

**Rate limiting:** Not implemented yet. Comment in RPC notes where to add it.

---

## Stripe Integration (Built 25-27 Jan 2026)

### Subscription Tiers
| Tier | Monthly | Annual (17% off) |
|------|---------|-------------------|
| Free | $0 | $0 |
| Basic | $29/mo | $290/yr |
| Premium | $79/mo | $790/yr |

### Stripe Price IDs (Sandbox)
| Tier | Monthly | Annual |
|------|---------|--------|
| Basic | `price_1StGZQCnDmgyQa6dz7mrD80L` | `price_1StGkDCnDmgyQa6dJOcQ0SDP` |
| Premium | `price_1StGaACnDmgyQa6dhp2qJsO0` | `price_1StGkpCnDmgyQa6dI4aYmsVQ` |

### Edge Functions (6 total + shared)
| Function | Purpose |
|----------|---------|
| `stripe-create-checkout` | Creates Stripe Checkout sessions |
| `stripe-create-portal` | Customer portal (manage subscription) |
| `stripe-webhook` | Handles all webhook events (subscriptions + Connect) |
| `stripe-connect-onboarding` | Inspector payout account setup (Connect Express) |
| `stripe-connect-dashboard` | Inspector earnings dashboard (Express Dashboard link) |
| `stripe-connect-payout` | Trigger payout to inspector after report approval |
| `_shared/stripe.ts` | Shared Stripe client + CORS + `calculateFees()` + `getSupabaseClient()` |

### Profile columns for Stripe
`stripe_customer_id`, `subscription_status`, `subscription_tier`, `subscription_current_period_end`, `stripe_connect_account_id`, `stripe_connect_onboarding_complete`

### Guest Subscription Flow
Non-logged-in user clicks Subscribe -> stores plan in sessionStorage -> redirects to `/auth?mode=signup&plan=basic&billing=annual` -> after signup redirects to `/pricing` -> auto-triggers Checkout

### Platform Fees
- Inspection marketplace: 10% platform fee (inspector gets 90%)
- `_shared/stripe.ts` has `PLATFORM_FEE_PERCENT = 10` and `calculateFees(amount)` helper
- All amounts stored in cents in Stripe, displayed in dollars in UI

### Stripe Email Receipts
- **Escrow payments (one-time):** `receipt_email` set on PaymentIntent via `payment_intent_data.receipt_email` in `accept-bid-with-payment`. Stripe sends receipt automatically after payment.
- **Subscriptions:** Stripe sends invoice receipts automatically to the customer's email. Enable in Stripe Dashboard: Settings > Emails > Successful payments.
- **In-app notification:** `payment_confirmed` notification sent to poster after escrow checkout completes (via webhook).

### Webhook Events Handled
- `checkout.session.completed` - Update subscription status
- `customer.subscription.updated` - Sync subscription changes
- `customer.subscription.deleted` - Mark subscription cancelled
- `account.updated` - Set `stripe_connect_onboarding_complete` on profiles
- `transfer.created` - Create notification for inspector about payment received

### Stripe Test Mode: Payout Debugging (28 Jan 2026)

**Important:** In Stripe test mode, checkout charges go to the **pending balance**, not the available balance. Stripe transfers require **available balance**. This means payouts will fail with "insufficient available funds" unless test funds are added.

**To add available test funds:**
```bash
curl https://api.stripe.com/v1/charges \
  -u sk_test_KEY: \
  -d amount=50000 \
  -d currency=aud \
  -d source=tok_bypassPending \
  -d description="Test funds for available balance"
```
The `tok_bypassPending` token creates charges that go directly to available balance.

**To check Stripe balance:**
```bash
curl https://api.stripe.com/v1/balance -u sk_test_KEY:
```

**Payout retry:** If `payout_status` is stuck at `'processing'` or `'failed'`, reset it and re-invoke the edge function:
```bash
# Reset status
curl -X PATCH "${SUPABASE_URL}/rest/v1/inspection_jobs?id=eq.${JOB_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"payout_status": null}'

# Re-invoke payout
curl -X POST "${SUPABASE_URL}/functions/v1/stripe-connect-payout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "JOB_UUID"}'
```

---

## Inspection Marketplace

### How It Works
1. **Buyer's agent** posts an inspection job (property address, requirements, budget, deadline)
2. **Escrow payment** is secured upfront (full budget amount held by platform)
3. Job appears on **Inspection Spotlights** board for inspectors
4. **Building inspectors** submit bids with price and availability
5. Buyer's agent reviews bids, accepts one -> job assigned
6. Inspector performs inspection, submits report via **InspectionReportBuilder**
7. Agent reviews report via **InspectionReportView**, approves it
8. `createConnectPayout()` fires -> Stripe Transfer sends 90% to inspector's Connect account
9. Platform retains 10% fee

### Job Status Workflow
```
draft -> open -> assigned -> in_progress -> pending_review -> completed
              \-> pending_inspector_setup -> assigned       -> cancelled
```
Note: `pending_inspector_setup` is used when the accepted inspector hasn't completed Stripe Connect onboarding. The job auto-transitions to `assigned` when they complete setup.

### Payment Status Workflow
```
pending -> paid (escrow secured) -> released (report approved) -> refunded (if cancelled)
```

### Payout Status Workflow
```
null -> pending (inspector not onboarded) -> processing -> paid
                                                        -> failed
```

### Key Pages
- `CreateInspectionJob.tsx` - 5-step form: Property -> Requirements -> Budget (with fee breakdown) -> Payment (escrow) -> Review
- `InspectionSpotlights.tsx` - Job board (browse/filter)
- `InspectionSpotlightDetail.tsx` - Single job with bid submission, fee transparency for both poster and inspector
- `MyPostedJobs.tsx` - Agent's posted jobs with bid management, escrow status, payment breakdown on completed
- `MyInspectionWork.tsx` - Inspector's bids/active/completed work with net earnings (90%)
- `InspectionReportBuilder.tsx` - Submit inspection reports
- `InspectionReportView.tsx` - View reports, approve -> triggers payout

### Database Tables
- `inspection_jobs` - Job postings with status/payment/payout workflow columns
- `inspection_bids` - Bids from inspectors
- `inspection_reports` - Completed inspection reports
- `inspection_bid_history` - Bid edit audit trail
- `inspection_payments` - Payment records with `stripe_transfer_id`, `gross_amount`, `platform_fee`, `net_amount`

### Client Brief Linking
Inspection jobs can be linked to client briefs via `client_brief_id` FK. Client briefs define a buyer's search criteria (location, property type, budget). Inspector then evaluates property against those criteria.

---

## Geospatial System

- **PostGIS** enabled for spatial queries
- **Tables:** `locations` (geocoded points), `agent_service_areas` (service coverage), `client_brief_locations` (brief search areas with priority tiers)
- **Mapbox** for geocoding addresses to lat/lng
- **PropertyAddressSearch** component with autocomplete
- **LocationSearch** component for service area management
- Properties have geography columns for spatial indexing
- General area bookings: Jobs can be posted without exact addresses (`property_address` starts with `"Area: "`)

---

## Auth & Permissions

### `src/contexts/AuthContext.tsx`
- Supabase Auth with session management
- Profile interface includes all Stripe fields
- `refreshProfile()` function for post-webhook checks
- User metadata includes `full_name`, `user_type`, `is_approved`

### `src/lib/permissions.ts`
- Role-based permission checks
- Key permissions: `CAN_POST_INSPECTIONS`, `CAN_SUBMIT_PROPERTY`, `CAN_MANAGE_CLIENT_BRIEFS`
- Professional roles require admin approval
- Admin panel for user management

### Approval Workflow
1. User signs up, selects professional role
2. Profile created with `is_approved = false`
3. Admin reviews in Admin panel
4. Admin approves -> user gains full access
5. Professional accreditation tracking

---

## Design Patterns & Conventions

### Supabase API Calls
- **RPC functions** for complex multi-table operations (SECURITY DEFINER)
- **REST API** for simple CRUD (direct table access via `supabase.from()` or raw fetch)
- **Raw fetch pattern:** Many pages use direct `fetch()` to Supabase REST API with manually constructed auth headers (see `getAuthHeaders()` pattern in multiple files)
- **Real-time:** `postgres_changes` for persistent data, `broadcast` for ephemeral data, `presence` for online status
- **Auth headers:** Extracted from `localStorage` for REST calls (`sb-{ref}-auth-token`)

### Supabase Management API (for migrations & admin)
Used to apply migrations and run ad-hoc SQL when the Supabase CLI isn't available:
```
# Get service role key
GET https://api.supabase.com/v1/projects/yrjtdunljzxasyohjdnw/api-keys
Authorization: Bearer sbp_fbb3d371e81e96d2646f29d96191f334a480fa05

# Execute SQL
POST https://api.supabase.com/v1/projects/yrjtdunljzxasyohjdnw/database/query
Authorization: Bearer sbp_fbb3d371e81e96d2646f29d96191f334a480fa05
Content-Type: application/json
Body: { "query": "SELECT 1" }
```
**Note:** For complex SQL with dollar-quoting (`$$`), use a Node.js `.cjs` script file to avoid shell escaping issues (the project has `"type": "module"` in package.json so `.cjs` extension is needed for CommonJS).

### Edge Function Pattern
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getStripe, corsHeaders, getSupabaseClient } from '../_shared/stripe.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // ... business logic
  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
```

### UI Patterns
- **DashboardLayout** wraps all authenticated pages (sidebar + topbar)
- **shadcn/ui** for all base components
- **Forest green** (`#0D9488` / teal-600) as primary brand colour
- **Toast notifications** via `sonner`
- **Loading states** with Skeleton components throughout
- **Mobile responsive** with show/hide panels and bottom nav
- **Fee amounts** always shown in AUD with `toFixed(2)` or `toLocaleString('en-AU')`

### State Management
- React Context for global state (Auth, Units, MessageNotifications)
- Local state + URL params for page-level state
- `useSearchParams` for deep-linking (conversations, filters, tabs)
- `sessionStorage` for cross-page flows (subscription redirect)

---

## Deployment (Live URL for Dani)

### Vercel Deployment (Set up 17 Feb 2026)
- **Live URL:** https://agent-network-hub-1ynd.vercel.app
- **Platform:** Vercel (free tier), auto-deploys from `main` branch on GitHub
- **GitHub repo:** https://github.com/JodieWalsh/agent-network-hub
- **Environment variables** are configured in Vercel project settings (same 5 `VITE_` vars as local .env)
- **Supabase redirect URL** added: `https://agent-network-hub-1ynd.vercel.app/**` (in Supabase Auth URL Configuration)
- **Backend:** Supabase Edge Functions are deployed separately (already live)
- **Auto-deploy:** Every push to `main` triggers a new Vercel build and deploy

### Previous Deployment Attempts
- **Lovable.dev:** Original deployment method (README says "Share → Publish"), but version was out of date after local development
- **Netlify:** Attempted but had issues with environment variables not being picked up
- **GitHub Pages:** Attempted but YAML workflow file had paste formatting issues

---

## Environment Variables
```
VITE_SUPABASE_URL=https://yrjtdunljzxasyohjdnw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=yrjtdunljzxasyohjdnw
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx
```

For Supabase Edge Functions (set via `supabase secrets set`):
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Community Forum (Built 17 Feb 2026)

### Overview
Professional discussion forum integrated into the platform. Phase 1 (17 Feb) delivers categories, regional boards, posts, replies, likes, bookmarks, follows, search, notifications, and reputation. Phase 2 (18 Feb) adds polls, case studies, expert badges, similar post suggestions, leaderboard, personal pages, edit/delete, and load more pagination.

### Database Tables (17)
**Core (9):** `forum_categories`, `forum_regional_boards`, `forum_posts`, `forum_replies`, `forum_post_media`, `forum_likes`, `forum_bookmarks`, `forum_follows`, `forum_user_regional_memberships`

**Supporting (8):** `forum_tags`, `forum_post_tags`, `forum_expert_badges`, `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_reports`, `forum_user_stats`

### Post Types
`discussion`, `question`, `poll`, `case_study`

### Pages & Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/forums` | ForumHome | Landing with categories, regional boards, trending, search |
| `/forums/category/:slug` | ForumCategoryView | Posts filtered by category with load more |
| `/forums/region/:slug` | ForumRegionalBoard | Posts filtered by regional board, join/leave, load more |
| `/forums/post/:id` | ForumPostView | Post detail, replies, like/bookmark/follow, edit/delete, report |
| `/forums/new` | ForumNewPost | Create post with polls, case studies, similar suggestions |
| `/forums/leaderboard` | ForumLeaderboard | Reputation leaderboard with all-time/monthly tabs |
| `/forums/my-posts` | ForumMyPosts | User's own posts with type/sort filters |
| `/forums/my-bookmarks` | ForumMyBookmarks | Bookmarked posts with remove action |

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/forum.ts` | All types + API functions (following messaging.ts pattern) |
| `src/components/forum/PostCard.tsx` | Reusable post card for lists with poll/case study badges |
| `src/components/forum/ReplyThread.tsx` | Reply with 2-level nested children, edit/delete |
| `src/components/forum/ReplyEditor.tsx` | Reply input component |
| `src/components/forum/ForumSidebar.tsx` | Sidebar: stats, top contributors, unanswered, my posts/bookmarks links |
| `src/components/forum/PollDisplay.tsx` | Poll voting and results with progress bars |
| `src/components/forum/CaseStudyDisplay.tsx` | Structured case study sections (Situation/Findings/Lessons) |
| `src/components/forum/UserBadges.tsx` | Expert badge icons with tooltips |

### RPC Functions
| Function | Purpose |
|----------|---------|
| `toggle_forum_like` | Like/unlike posts and replies, updates user stats + reputation |
| `toggle_forum_bookmark` | Bookmark/unbookmark posts |
| `toggle_forum_follow` | Follow/unfollow posts for reply notifications |
| `increment_post_view_count` | Increment view counter |
| `mark_reply_as_solution` | Mark reply as accepted answer (question posts only), awards +10 reputation |
| `search_forum_posts` | Full-text search using `tsvector` + GIN index |
| `vote_forum_poll` | Cast vote(s) on a poll, handles single/multiple choice |
| `check_and_award_badges` | Check user stats against thresholds, award new badges |

### Notification Types (6 new)
| Type | Trigger | Icon | Color |
|------|---------|------|-------|
| `forum_reply` | Reply to your post | MessageCircle | forest/green |
| `forum_mention` | @mention (Phase 2) | AtSign | indigo |
| `forum_like` | Like on your post | Heart | red |
| `forum_solution` | Reply marked as solution | CheckCircle2 | green |
| `forum_follow_reply` | Reply on followed post | Bell | forest/green |
| `forum_badge_earned` | Expert badge awarded | Award | pink |

### Reputation Points
| Action | Points |
|--------|--------|
| Create post | +5 |
| Reply | +2 |
| Like received (post) | +3 |
| Like received (reply) | +1 |
| Solution marked | +10 |

### Seed Data
- **10 categories:** Market Trends, Legal & Compliance, Inspection Tips, Buyer Strategies, Technology & Tools, Networking & Events, Finance & Lending, Styling & Presentation, Career & Business, General Discussion
- **10 regional boards:** Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Canberra, Darwin, Gold Coast, Newcastle

### Expert Badge Thresholds
| Badge | Requirement |
|-------|-------------|
| Helpful Member | 10+ replies |
| Problem Solver | 5+ solutions |
| Top Contributor | 50+ posts |
| Rising Star | 100+ reputation |
| Expert | 500+ reputation |
| Community Leader | 1000+ reputation |

### Migrations
```
20260217010000_create_forum_core_tables.sql       9 core tables + RLS + indexes + triggers
20260217020000_create_forum_supporting_tables.sql  8 supporting tables + seed data
20260217030000_create_forum_functions_and_search.sql  RPC functions + full-text search + notification types
20260218010000_add_forum_counter_rpcs.sql          Counter increment RPCs (bug fix)
20260218020000_forum_phase2.sql                    Phase 2: post_type expansion, case study columns, edited_at, poll/badge RLS, vote_forum_poll RPC, check_and_award_badges RPC, forum-media bucket
```

### Phase 2 (Completed 18 Feb 2026)
Polls, case studies, expert badges, similar post suggestions, leaderboard, my posts/bookmarks pages, edit/delete for posts and replies, load more pagination on all list pages

### Phase 3 (Planned)
Admin moderation dashboard, premium categories, pinned posts, @mention support, weekly digest emails, trending algorithm improvements, post media upload UI

---

## Documentation Files
| File | Purpose |
|------|---------|
| `docs/TECHNICAL_DOCUMENTATION.md` | Architecture reference |
| `docs/KEY_FEATURES.md` | Feature list |
| `docs/COMMUNICATION_SYSTEM_PLAN.md` | Messaging system design doc |
| `docs/FORUM_SYSTEM.md` | Forum system design doc |
| `docs/PROJECT_TODO.md` | Outstanding work items |
| `docs/DANI_APPROVAL_CHECKLIST.md` | Business decisions needing stakeholder approval |

---

## Complete Commit History (Chronological)

### Early Sessions (pre-Claude notes)
- Initial project setup, auth, profiles, property marketplace
- Client briefs system with smart location preferences
- PostGIS geospatial system, service area management
- Welcome/onboarding wizard
- Admin panel with approval workflows
- Professional directory

### Session: ~24 January 2026 (Inspection Marketplace)
- `9c1ad08` - feat: add inspection marketplace database tables
- `d12521c` - feat: add CreateInspectionJob multi-step form
- `4d06bc7` - feat: add InspectionSpotlights job board
- `16b27d1` - feat: add InspectionSpotlightDetail single job view
- `f75ee94` - fix: improve property address search and add general area booking
- `6f5294d` - feat: display general area bookings with visual indicators
- `aa71a2e` - feat: link inspection jobs to client briefs
- `3223879` - feat: add My Posted Jobs dashboard with bid management
- `167c4fc` - feat: show bids inline on My Posted Jobs dashboard
- `705330b` - feat: add My Inspection Work dashboard for inspectors
- `de3b3d7` - feat: build comprehensive inspection report form
- `3a5241c` - feat: add read-only report view for job posters
- Various debug/fix commits for report viewing

### Session: 25 January 2026 (Escrow + Stripe + Fee Transparency)
- `c188585` - feat: add transparent fee breakdowns and opinion disclaimers throughout inspection workflow
- `af093df` - feat: implement escrow payment workflow with upfront payment and refund protection
- `47992e1` - feat: add clean subscription pricing page with Stripe Checkout
- `a71562e` - chore: add Stripe environment variable placeholders to .env
- `6410fbc` - fix: redirect to sign up page when subscribing as guest
- Various Stripe checkout fixes (`8490fd9`, `50e211f`, `0b77a03`)
- `54bf5ae` - feat: add welcome onboarding page and billing management
- `3221b26` - fix: update subscription tier in checkout.session.completed webhook

### Session: 25-26 January 2026 (Messaging System - 6 Phases)
- `c9473c6` - feat: add core messaging system with real-time updates (Phase 1)
- `8566c0e` through `0598b4b` - Multiple RLS and RPC fixes for messaging
- `659d0af` - fix: remove city field, show suburb in messaging
- `e282b18` - feat: add unread badge and toast notifications for new messages
- `17d0479` - feat: add typing indicator, read receipts, and online presence (Phase 2)
- `35723bb` - feat: add message buttons throughout app and notification integration (Phase 3)
- `12e09ee` - feat: add image and document attachments to messaging (Phase 4)
- `d20aa4c` - feat: add job-linked contextual conversations (Phase 5)
- `aec41bc` - feat: add custom-titled conversations and New Topic button (Phase 6)

### Session: 27 January 2026 (Stripe Connect + Fee Transparency)
- `264516e` - feat: implement Stripe Connect for inspector payouts
  - New: `stripe-connect-payout` Edge Function
  - New: `ConnectReturn.tsx` page + route
  - New: `20260127010000_add_payout_tracking.sql` migration
  - Updated: Billing page with payout setup + earnings sections
  - Updated: InspectionReportView to trigger payout on approval
  - Updated: MyPostedJobs with payment breakdown on completed jobs
  - Updated: AuthContext Profile with `stripe_connect_*` fields
  - Updated: `stripe.ts` with `createConnectPayout()`
  - Updated: `stripe-connect-onboarding` URLs
  - Updated: `stripe-webhook` for transfer.created notifications
- `e2fa1f0` - feat: add fee transparency messaging throughout payment flow
  - Job detail page: poster sees escrow status, inspector sees earnings at every job state
  - MyPostedJobs: "$X in escrow" / "Inspector paid $X" per card
  - MyInspectionWork: net earnings (90%) on bids, submitted, and completed
  - Stats card correctly shows 90% net totals

### Session: 28 January 2026 (Multi-Currency + International)
- `e6b250f` - feat: add international country selector for Stripe Connect onboarding
  - PayoutSetup page: 33-country dropdown for Connect Express
- `626a297` - feat: add dedicated payout setup page for inspectors
  - New route `/settings/payouts`, job context from URL params
- `f746d16` - feat: add multi-currency database support
  - Migration: `profiles.country_code`, `profiles.default_currency`
  - `formatPriceWithCode()` in currency.ts
  - AuthContext Profile updated with new fields
- `9e6fdab` - feat: add country and currency to user profile
  - ProfileEdit: country/currency dropdowns with auto-suggest
- `28b6a1a` - feat: currency-aware job posting
  - CreateInspectionJob: dynamic currency symbol, `budget_currency` saved
- `4cf599b` - feat: show job currency throughout marketplace
  - All 7 display pages use `formatPrice()` with job currency
  - Removed all hardcoded `$` and `'en-AU'` locale patterns
- `18c98dd` - feat: multi-currency Stripe checkout and payouts
  - All 3 Stripe edge functions use dynamic currency from job
- `fdf14c8` - feat: add cross-currency conversion notes for inspectors
  - Subtle note when inspector currency differs from job currency

### Session: 28 January 2026 (Bug Fixes + Area Notifications)
- `0f529e8` - fix: add job transition safety net to stripe-connect-status
- `1913a71` - fix: handle null budget_min/budget_max in MyPostedJobs to prevent blank screen
- `1762734` - fix: payout error handler now reliably marks failed status
  - Bug: `stripe-connect-payout` error handler used `req.clone().json()` which fails after body consumed
  - Fix: extract `jobId` to outer-scope `let` before try block so error handler can access it
  - Deployed updated edge function to Supabase
- `098efa8` - docs: comprehensive CLAUDE.md update for session continuity
- `cbe4c79` - feat: add job_posted_nearby notification type and matching RPC
  - Migration: updated CHECK constraint, created `notify_nearby_inspectors()` RPC (SECURITY DEFINER)
  - 6 matching strategies: radius, global, region, state, country, home proximity
- `3be7d3b` - feat: add job_posted_nearby notification type to frontend
  - `notifications.ts`: type, icon (MapPin), color (blue), route to job detail
  - `NotificationBell.tsx`: MapPin icon mapping
- `b17e87a` - feat: notify nearby inspectors when new job is posted
  - `CreateInspectionJob.tsx`: changed to `return=representation`, calls RPC after job creation
  - Fixed double OR syntax bug in migration SQL and live database function

### Session: 17-18 February 2026 (Community Forum)
- Forum Phase 1 commits (17 Feb) — core tables, supporting tables, RPC functions, all 5 pages
- `004adfa` - chore: add Netlify SPA redirects for deployment
- `555eeed` - docs: update CLAUDE.md with area notifications, payout debugging, and management API

### Session: 18 February 2026 (Forum Phase 2)
- `bb0853e` - feat: add Phase 2 forum database migration and API functions
  - Migration: post_type expansion, case study columns, edited_at, poll/badge RLS, vote_forum_poll + check_and_award_badges RPCs, forum-media bucket
  - ~15 new API functions in forum.ts
- `9e2e77b` - feat: add polls UI with poll builder, voting, and results display
  - PollDisplay component, poll builder in ForumNewPost, purple Poll badge on PostCard
- `8583182` - feat: add case study post type with structured fields and display
  - CaseStudyDisplay component, case study form in ForumNewPost, indigo Case Study badge
- `f35b2c7` - feat: add expert badges system with auto-award and display
  - UserBadges component, integrated in PostCard/ReplyThread/ForumPostView, auto-award after marking solution
- `aaf826a` - feat: add similar post suggestions when typing title
  - Debounced search (300ms, 15+ chars) in ForumNewPost
- `9988ec2` - feat: add leaderboard, my posts, and my bookmarks pages
  - 3 new pages + routes, sidebar links
- `776ff83` - feat: add edit and delete UI for posts and replies
  - Inline edit, soft-delete posts, hard-delete replies, (edited) indicator
- `b891417` - feat: add load more pagination to forum list pages
  - PAGE_SIZE=10, Load More button on category, regional board, and trending pages
