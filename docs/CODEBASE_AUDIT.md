# Codebase Audit — Buyers Agent Hub

**Date:** 12 June 2026
**Scope:** Full `src/` directory — 159 files, ~46,600 lines of TypeScript/TSX
**Method:** Every page and component enumerated; database references, TODOs, and incomplete features located via systematic search and inspection.

---

## 1. Pages (`src/pages/` — 41 files)

### Core
| Route | File | Purpose |
|-------|------|---------|
| `/` | `Index.tsx` | Dashboard (quiet luxury redesign, June 2026). Logged-out users see `Landing.tsx` |
| — | `Landing.tsx` | Marketing landing page for logged-out visitors (rendered by Index, no own route) |
| `/auth` | `Auth.tsx` | Login/signup/forgot-password (luxury split-panel redesign, June 2026). Google OAuth + plan redirect |
| `/auth/reset-password` | `ResetPassword.tsx` | Password reset completion |
| `/welcome` | `Welcome.tsx` | Post-subscription onboarding (shown after Stripe checkout) |
| `/activity` | `Activity.tsx` | Full paginated notification list with filters |
| `/admin` | `Admin.tsx` | Admin panel: user approvals, property review, stats, role management |
| `*` | `NotFound.tsx` | 404 |

### Directory & Marketplace
| Route | File | Purpose |
|-------|------|---------|
| `/directory` | `Directory.tsx` | Professional directory with filters and message buttons |
| `/profiles/:userId` | `PublicProfile.tsx` | Public profile (reputation, reviews; hides private data) |
| `/marketplace` | `Marketplace.tsx` | Off-market property listings |
| `/marketplace/add` | `AddProperty.tsx` | Property submission form |

### Client Briefs
| Route | File | Purpose |
|-------|------|---------|
| `/briefs` | `ClientBriefs.tsx` | Brief listing |
| `/briefs/new`, `/briefs/:id/edit` | `ClientBriefForm.tsx` | Brief create/edit with location preferences |
| `/briefs/:id` | `ClientBriefDetail.tsx` | Brief detail view |

### Inspections
| Route | File | Purpose |
|-------|------|---------|
| `/inspections` | `Inspections.tsx` | Inspection hub — **legacy: reads `inspection_requests` table via `supabase.from()`** |
| `/inspections/new` | `PostInspection.tsx` | **Legacy job form — writes to `inspection_requests`, uses mock geocoder** |
| `/inspections/jobs/new` | `CreateInspectionJob.tsx` | Current 5-step job form with escrow payment (writes `inspection_jobs`) |
| `/inspections/spotlights` | `InspectionSpotlights.tsx` | Job board |
| `/inspections/spotlights/:id` | `InspectionSpotlightDetail.tsx` | Job detail with bidding + fee transparency |
| `/inspections/my-jobs` | `inspections/MyPostedJobs.tsx` | Poster's job management |
| `/inspections/my-work` | `inspections/MyInspectionWork.tsx` | Inspector's bids/work/earnings |
| `/inspections/jobs/:jobId/report` | `InspectionReportBuilder.tsx` | Inspector report submission |
| `/inspections/jobs/:jobId/report/view` | `InspectionReportView.tsx` | Report viewer; approval triggers payout |

### Forum (10 pages)
| Route | File |
|-------|------|
| `/forums` | `ForumHome.tsx` |
| `/forums/category/:slug` | `ForumCategoryView.tsx` |
| `/forums/region/:slug` | `ForumRegionalBoard.tsx` |
| `/forums/post/:id` | `ForumPostView.tsx` |
| `/forums/new` | `ForumNewPost.tsx` |
| `/forums/leaderboard` | `ForumLeaderboard.tsx` |
| `/forums/my-posts` | `ForumMyPosts.tsx` |
| `/forums/my-bookmarks` | `ForumMyBookmarks.tsx` |
| `/forums/featured` | `ForumFeatured.tsx` |
| `/forums/admin` | `ForumAdmin.tsx` |

### Messaging, Billing & Settings
| Route | File | Purpose |
|-------|------|---------|
| `/messages` | `Messaging.tsx` | Full messaging UI (~1,300 lines: real-time, typing, receipts, attachments) |
| `/pricing` | `Pricing.tsx` | Subscription plans with Stripe Checkout |
| `/settings/profile` | `settings/ProfileEdit.tsx` | Profile, location, notification preference settings |
| `/settings/billing` | `settings/Billing.tsx` | Subscription management + inspector payouts + earnings |
| `/settings/notifications` | `settings/NotificationSettings.tsx` | Email digest/notification toggles |
| `/settings/payouts` | `settings/PayoutSetup.tsx` | Stripe Connect onboarding (33-country selector) |
| `/settings/connect-return` | `settings/ConnectReturn.tsx` | Stripe Connect redirect handler |

---

## 2. Components (`src/components/`)

### Feature components
| Folder | Components | Notes |
|--------|-----------|-------|
| `admin/` | AdminPropertyReviewModal | Uses `supabase.from('properties')` |
| `auth/` | ProtectedRoute | Route guard wrapper |
| `client-brief/` | BriefLocationManager | Brief location preferences with priority tiers |
| `dashboard/` | StatsGrid, PowerTiles, RecentActivity, **WelcomeHeader (UNUSED)** | Redesigned June 2026; stat values are hardcoded placeholders |
| `directory/` | ProfileDetailModal | |
| `filters/` | LocationSearchFilter | **Uses mock geocoder (Australian cities only)** |
| `forum/` | PostCard, ReplyThread, ReplyEditor, ForumSidebar, PollDisplay, CaseStudyDisplay, UserBadges, PhotoUploader, PhotoGallery | Complete forum UI kit |
| `layout/` | DashboardLayout, AppSidebar, TopBar, BottomNav | Shared shell (redesigned June 2026, mobile-ready) |
| `location/` | LocationSearch | Mapbox autocomplete (the real geocoder) |
| `marketplace/` | PropertyGallery, PropertyMap, PropertyDetailModal | |
| `messaging/` | NewMessageModal | Two-step user search + topic flow |
| `notifications/` | NotificationBell | Badge now rose gold; 30s polling |
| `profile/` | AvatarUpload, ServiceAreaManager, ApplyForProfessionalButton | |
| `property/` | ImageUpload, PropertyAddressSearch, PriceInput | |
| root | NavLink (**UNUSED**), ScrollToTop (used in App.tsx) | |

### UI primitives (`ui/` — 50 files)
shadcn/ui components (accordion → tooltip) plus custom: `currency-badge`, `role-badge`, `verified-badge`, `trust-tip-banner`, `unit-toggle`.

### Contexts, hooks, lib
| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Auth/session/profile state — **uses `supabase.from('profiles')`** |
| `contexts/MessageNotificationContext.tsx` | Global unread count + message toasts |
| `contexts/UnitsContext.tsx` | Imperial/metric preference |
| `hooks/use-mobile.tsx`, `use-toast.ts` | Viewport + toast hooks |
| `lib/messaging.ts` (752 ln) | Messaging API (raw fetch + RPCs + realtime) |
| `lib/notifications.ts` (811 ln) | Notification creation/fetch + email triggers |
| `lib/forum.ts` | Forum API (types + ~40 functions) |
| `lib/stripe.ts` | Checkout, portal, Connect onboarding/payout |
| `lib/currency.ts` | 30+ currency formatting, 33 countries |
| `lib/email.ts` | Fire-and-forget call to `send-email` edge function |
| `lib/permissions.ts` | Role-based permission checks |
| `lib/storage.ts` | Supabase Storage helpers |
| `lib/mapbox-geocoder.ts` | Real Mapbox geocoding |
| `lib/geocoder.ts` | **Legacy mock geocoder — hardcoded Australian city list** |
| `lib/dateUtils.ts`, `lib/utils.ts` | Date + `cn()` helpers |
| `integrations/supabase/client.ts` | Supabase JS client |
| `integrations/supabase/types.ts` | **Stale generated types — only 3 tables (inspection_requests, profiles, properties); ~30 exist** |

---

## 3. Database Tables Referenced in Code

### Tables (via REST `rest/v1/` or `supabase.from()`)
| Table | Refs | Notes |
|-------|------|-------|
| `inspection_jobs` | 18 | Current marketplace |
| `profiles` | 17 + 15 `supabase.from()` | |
| `forum_posts` | 16 | |
| `client_briefs` | 13 | |
| `inspection_bids` | 10 | |
| `properties` | 11 (all `supabase.from()`) | Marketplace, AddProperty, Admin, AdminPropertyReviewModal |
| `forum_reports` | 8 | |
| `forum_replies` | 7 | |
| `inspection_reports` | 6 | |
| `notifications` | 5 | |
| `forum_user_stats`, `forum_user_regional_memberships` | 4 each | |
| `notification_preferences`, `forum_tags`, `forum_regional_boards`, `forum_post_media`, `forum_categories` | 3 each | |
| `messages`, `inspection_bid_history`, `forum_post_tags`, `forum_polls`, `forum_poll_options`, `forum_likes`, `forum_email_preferences`, `forum_bookmarks` | 2 each | |
| `inspection_reviews` | 1 | Queried by PublicProfile; table exists in migrations but review-writing UI is not built |
| `inspection_requests` | 2 | **LEGACY** — only Inspections.tsx + PostInspection.tsx |
| `forum_poll_votes`, `forum_follows`, `forum_expert_badges`, `client_brief_locations`, `agent_service_areas` | 1 each | |

Tables in migrations but not directly named in src (accessed via RPC): `conversations`, `conversation_participants`, `locations`.

### RPC functions called from frontend (29)
**Messaging:** `create_conversation`, `get_user_conversations`, `get_conversation_details`, `mark_conversation_read` (others — `send_message`, `search_users`, `get_unread_message_count` — were replaced by direct REST queries in `messaging.ts`)
**Forum:** `toggle_forum_like`, `toggle_forum_bookmark`, `toggle_forum_follow`, `increment_post_view_count`, `mark_reply_as_solution`, `search_forum_posts`, `vote_forum_poll`, `check_and_award_badges`, `increment/decrement_post_reply_count`, `increment/decrement_category_post_count`, `increment/decrement_board_post_count`, `increment/decrement_board_member_count`, `increment/decrement_forum_user_stats`
**Other:** `notify_nearby_inspectors`, `insert_radius_service_area`

### Storage buckets
`avatars` (via `storage.from('avatars')`); `message-attachments` and `forum-media` referenced in lib/messaging.ts and forum upload flow.

---

## 4. TODO Comments & Known Issues in Code

| Location | Comment / Issue |
|----------|----------------|
| `lib/notifications.ts:185` | `// TODO: Implement email sending via Resend` — **STALE**: email IS implemented (`sendNotificationEmail` is imported and called in 8 helpers). Comment should be removed |
| `pages/inspections/MyInspectionWork.tsx:11` | TODO: Future earnings dashboard enhancement |
| `pages/inspections/MyInspectionWork.tsx:320` | `averageRating: 4.8, // TODO: Calculate from actual reviews` — **hardcoded rating** |
| `pages/inspections/MyInspectionWork.tsx:1027` | TODO: Fetch actual review data |
| `pages/inspections/MyInspectionWork.tsx:601` | "Leave Review" button shows `toast.info('Review feature coming soon!')` |
| `pages/Welcome.tsx:81` | `const hasSpecializations = false; // TODO: Check actual specializations` |
| `components/location/LocationSearch.tsx:188` | TODO: arrow-key navigation for autocomplete |

---

## 5. Incomplete or Broken Items (Ranked)

### 🔴 High — functional problems

1. ~~**Legacy duplicate inspection flow is live.**~~ **FIXED 12 June 2026.** `/inspections` and `/inspections/new` now permanently redirect to `/inspections/spotlights` and `/inspections/jobs/new`; the dashboard "Review Offers" button and "Request Inspection" tile point directly at the real marketplace. `Inspections.tsx` and `PostInspection.tsx` are now unreachable dead code (kept on disk, no routes) — safe to delete along with `lib/geocoder.ts` consumers once the filter migration (item 3) is done. The legacy `inspection_requests` table still exists in the database.

2. **`supabase.from()` rule violations** (project rule: raw fetch only). DB queries via the supabase client exist in: `AuthContext.tsx`, `Admin.tsx`, `AdminPropertyReviewModal.tsx`, `AddProperty.tsx`, `Marketplace.tsx`, `Inspections.tsx` (~33 call sites, mostly `properties` and `profiles`). These pre-date the rule; flagged for migration. (`storage.from('avatars')` is the Storage API — fine.)

3. **Mock geocoder still active in production filters.** `lib/geocoder.ts` (hardcoded Australian city list) is used by `LocationSearchFilter`, which powers location filtering on **Directory, Marketplace, and Inspections**. International users (33 supported countries) cannot filter by their own locations. The real Mapbox geocoder (`LocationSearch`) is only used in profile/property/brief forms.

4. **Stale generated Supabase types.** `integrations/supabase/types.ts` knows only 3 tables; ~30 exist. Any code relying on these types gets no type safety for newer tables. Regenerate with `npx supabase gen types`.

4b. **`tsc --noEmit` fails with 93 pre-existing errors** (largely consequences of item 4's stale types): `AdminPropertyReviewModal`, `PropertyDetailModal`, `RecentActivity` icon map missing newer notification types, and others. The Vite build succeeds (esbuild doesn't type-check), so these don't block deploys — but type safety is effectively off in the affected files.

### 🟡 Medium — incomplete features

5. **Review system half-built.** `inspection_reviews` table exists and `PublicProfile.tsx` reads it, but there is no UI to write reviews ("Review feature coming soon!" toast) and `MyInspectionWork` hardcodes `averageRating: 4.8`.

6. **Dashboard stats are hardcoded placeholders.** `StatsGrid.tsx` shows static values (4 inspections, 12 properties, 7 messages, 4.9 rating) — not wired to real data.

7. **Old design palette outside the dashboard/auth.** `index.css` still defines `--forest: #064E3B` and `--rose-gold: #C9A84C` (old gold), so every page styled with `text-forest`/`bg-rose-gold` tokens (forum, messaging, briefs, marketplace, etc.) renders the pre-redesign palette. `Landing.tsx` and `Welcome.tsx` also hardcode old hex values. Only Dashboard + Auth use the new quiet-luxury palette (#2D6350/#B76E79).

8. **Landing page placeholders.** "COMING SOON" badge section and a mock map grid in `Landing.tsx`.

9. **Welcome page video placeholder** — "Video Coming Soon" badge.

10. **Push & SMS notifications** — permanently "Coming Soon" badges in ProfileEdit preferences.

### 🟢 Low — hygiene

11. **Unused components:** `dashboard/WelcomeHeader.tsx` and `NavLink.tsx` have no imports anywhere — dead code, safe to delete.
12. **Australia-centric content** despite international support: forum regional boards are 10 Australian cities; dashboard property spotlight says "Mosman NSW"; typical-cost guides are AUD (flagged in Dani checklist #1).
13. **Forum Phase-1 limitations** (documented in `docs/FORUM_SYSTEM.md`): client-side follower notifications, no view-count deduplication, naive trending sort.
14. **`Activity.tsx`** still uses red (`text-red-600`) for cancelled-state icons — intentional warning colour, but inconsistent with the new palette if strict adherence is wanted.
15. **Verification scripts in repo root** (`dashboard-verify.mjs`, `auth-verify.mjs`, `sidebar-probe.mjs`, `audit-screenshots.mjs`) contain the seeded admin credentials in plain text — fine for dev, should not ship to production CI without secret management.

---

*Generated by Claude Code audit, 12 June 2026.*
