# Claude Session Notes - Buyers Agent Hub

This file contains context and notes for Claude to remember across sessions.
Read this first before doing any work on this project.

---

## Platform Overview

**Buyers Agent Hub** (repo: `agent-network-hub`) is a professional networking marketplace for Australian property professionals. It connects buyers agents, real estate agents, building inspectors, conveyancers, mortgage brokers, and stylists.

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui component library + Tailwind CSS (custom `forest` green theme colour)
- **Backend:** Supabase (Auth, PostgreSQL, Real-time, Storage, Edge Functions)
- **Geospatial:** PostGIS + Mapbox Geocoding API
- **Payments:** Stripe (subscriptions + marketplace escrow)
- **Hosting:** Deployed via Supabase

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
    AuthContext.tsx                    Auth state provider
    UnitsContext.tsx                   Imperial/metric unit preferences
    MessageNotificationContext.tsx     Unread count, toast/browser notifications
  lib/
    currency.ts          Currency formatting (AUD)
    geocoder.ts          Legacy geocoder
    mapbox-geocoder.ts   Mapbox geocoding integration
    messaging.ts         Full messaging API (752 lines) - see Messaging section
    notifications.ts     Notification system (811 lines) - see Notifications section
    permissions.ts       Role-based permission system
    storage.ts           Supabase storage helpers
    stripe.ts            Stripe client, checkout, portal, Connect
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
    InspectionSpotlightDetail.tsx  Single job detail with bidding
    PostInspection.tsx           Post-inspection job form
    CreateInspectionJob.tsx      Create inspection job
    InspectionReportBuilder.tsx  Inspector report submission
    InspectionReportView.tsx     Report viewer
    ResetPassword.tsx            Password reset
    NotFound.tsx                 404
    settings/
      ProfileEdit.tsx            Profile settings
      Billing.tsx                Billing/subscription management
    inspections/
      MyPostedJobs.tsx           Jobs I've posted (buyer agent view)
      MyInspectionWork.tsx       Jobs I'm working on (inspector view)
supabase/
  functions/                     Stripe Edge Functions (5 functions + shared)
  migrations/                    56 migration files (see Database section)
docs/
  TECHNICAL_DOCUMENTATION.md     Architecture reference
  KEY_FEATURES.md                Feature list
  COMMUNICATION_SYSTEM_PLAN.md   Messaging system design doc
  PROJECT_TODO.md                Outstanding work items
  DANI_APPROVAL_CHECKLIST.md     Business decisions needing stakeholder approval
```

---

## Messaging System (Built 25-26 Jan 2026)

The messaging system is the most complex feature in the codebase. It was built in 4 phases across multiple sessions.

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

**Notification types:** `bid_received`, `bid_accepted`, `bid_declined`, `bid_edited`, `job_assigned`, `report_submitted`, `report_approved`, `payment_released`, `payment_refunded`, `review_received`, `badge_earned`, `job_expired`, `job_cancelled`, `new_message`

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

---

## Stripe Integration (Built 25 Jan 2026)

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

### Edge Functions
| Function | Purpose |
|----------|---------|
| `stripe-create-checkout` | Creates Stripe Checkout sessions |
| `stripe-create-portal` | Customer portal (manage subscription) |
| `stripe-webhook` | Handles all webhook events |
| `stripe-connect-onboarding` | Inspector payout account setup |
| `stripe-connect-dashboard` | Inspector earnings dashboard |
| `_shared/stripe.ts` | Shared Stripe client + CORS + helpers |

### Profile columns for Stripe
`stripe_customer_id`, `subscription_status`, `subscription_tier`, `subscription_current_period_end`, `stripe_connect_account_id`, `stripe_connect_onboarding_complete`

### Guest Subscription Flow
Non-logged-in user clicks Subscribe -> stores plan in sessionStorage -> redirects to `/auth?mode=signup&plan=basic&billing=annual` -> after signup redirects to `/pricing` -> auto-triggers Checkout

### Platform Fees
- Inspection marketplace: 10% platform fee (inspector gets 90%)
- Subscriptions: Stripe handles billing directly

---

## Inspection Marketplace

### How It Works
1. **Buyer's agent** posts an inspection job (property address, requirements, budget, deadline)
2. Job appears on **Inspection Spotlights** board for inspectors
3. **Building inspectors** submit bids with price and availability
4. Buyer's agent reviews bids, accepts one
5. Inspector performs inspection, submits report via **InspectionReportBuilder**
6. Agent reviews report, approves it
7. Payment released from escrow

### Key Pages
- `PostInspection.tsx` / `CreateInspectionJob.tsx` - Create jobs
- `InspectionSpotlights.tsx` - Job board (browse/filter)
- `InspectionSpotlightDetail.tsx` - Single job with bid submission
- `MyPostedJobs.tsx` - Agent's posted jobs with bid management
- `MyInspectionWork.tsx` - Inspector's active/completed work
- `InspectionReportBuilder.tsx` - Submit inspection reports
- `InspectionReportView.tsx` - View completed reports

### Database Tables
- `inspection_jobs` - Job postings with status workflow
- `inspection_bids` - Bids from inspectors
- `inspection_reports` - Completed inspection reports
- `inspection_bid_history` - Bid edit audit trail

### Client Brief Linking
Inspection jobs can be linked to client briefs via `client_brief_id` FK. Client briefs define a buyer's search criteria (location, property type, budget).

---

## Geospatial System

- **PostGIS** enabled for spatial queries
- **Tables:** `locations` (geocoded points), `agent_service_areas` (service coverage), `client_brief_locations` (brief search areas with priority tiers)
- **Mapbox** for geocoding addresses to lat/lng
- **PropertyAddressSearch** component with autocomplete
- **LocationSearch** component for service area management
- Properties have geography columns for spatial indexing

---

## Auth & Permissions

### `src/contexts/AuthContext.tsx`
- Supabase Auth with session management
- User metadata includes `full_name`, `user_type`, `is_approved`

### `src/lib/permissions.ts`
- Role-based permission checks
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
- **REST API** for simple CRUD (direct table access via `supabase.from()`)
- **Real-time:** `postgres_changes` for persistent data, `broadcast` for ephemeral data, `presence` for online status
- **Auth headers:** Extracted from `localStorage` for REST calls (`sb-{ref}-auth-token`)

### UI Patterns
- **DashboardLayout** wraps all authenticated pages (sidebar + topbar)
- **shadcn/ui** for all base components
- **Forest green** (`#0D9488` / teal-600) as primary brand colour
- **Toast notifications** via `sonner`
- **Loading states** with Skeleton components throughout
- **Mobile responsive** with show/hide panels and bottom nav

### State Management
- React Context for global state (Auth, Units, MessageNotifications)
- Local state + URL params for page-level state
- `useSearchParams` for deep-linking (conversations, filters)
- `sessionStorage` for cross-page flows (subscription redirect)

---

## Environment Variables
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

For Supabase Edge Functions:
```sh
supabase secrets set STRIPE_SECRET_KEY=sk_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## Documentation Files
| File | Purpose |
|------|---------|
| `docs/TECHNICAL_DOCUMENTATION.md` | Architecture reference |
| `docs/KEY_FEATURES.md` | Feature list |
| `docs/COMMUNICATION_SYSTEM_PLAN.md` | Messaging system design doc |
| `docs/PROJECT_TODO.md` | Outstanding work items |
| `docs/DANI_APPROVAL_CHECKLIST.md` | Business decisions needing stakeholder approval |

---

## Session History

### Session: 25 January 2026
1. `47992e1` - feat: add clean subscription pricing page with Stripe Checkout
2. `a71562e` - chore: add Stripe environment variable placeholders to .env
3. `6410fbc` - fix: redirect to sign up page when subscribing as guest
4. Previous session: escrow payment workflow, fee transparency, approval checklist items #17-18

### Session: 25-26 January 2026 (Messaging)
5. `c9473c6` - feat: add core messaging system with real-time updates (Phase 1)
6. `8566c0e` through `0598b4b` - Multiple RLS and RPC fixes for messaging
7. `659d0af` - fix: remove city field, show suburb in messaging
8. `e282b18` - feat: add unread badge and toast notifications for new messages
9. `17d0479` - feat: add typing indicator, read receipts, and online presence (Phase 2)
10. `35723bb` - feat: add message buttons throughout app and notification integration (Phase 3)
11. `12e09ee` - feat: add image and document attachments to messaging (Phase 4)
12. `d20aa4c` - feat: add job-linked contextual conversations
13. `aec41bc` - feat: add custom-titled conversations and New Topic button

### Earlier Sessions (pre-Claude notes)
- Initial project setup, auth, profiles
- Property marketplace with gallery and map
- Client briefs system
- Inspection marketplace with bidding
- Inspection report builder
- Admin panel with approval workflows
- Professional directory
- PostGIS geospatial system
- Service area management
- Notification system foundation
- Welcome/onboarding wizard
- Billing settings page
