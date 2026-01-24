# Agent Hub - Project Context

---

## 📋 SESSION CHANGELOG - January 24, 2026

### Session Summary: Complete Inspection Marketplace Workflow - Notifications, Dashboards, Reports & Viewing

This session completed the full inspection marketplace workflow from job posting through to report approval, including a comprehensive notification system, two dashboards, a 16-section inspection report form, and a report viewing page.

---

### ✅ NOTIFICATION SYSTEM (Complete)

**Files Created:**
- `src/lib/notifications.ts` - Core notification helpers
- `src/components/notifications/NotificationBell.tsx` - Bell icon with unread count
- `src/components/notifications/NotificationDropdown.tsx` - Dropdown with notification list

**Database Migration:**
- `supabase/migrations/20260123020000_add_notification_system.sql`
- Tables: `notifications`, `notification_preferences`
- Full RLS policies for user-specific access

**Notification Types Supported:**
| Type | Recipient | Message Example |
|------|-----------|-----------------|
| `bid_received` | Job Poster | "Sarah wants to inspect 123 Main St for $250" |
| `bid_accepted` | Inspector | "You've got the gig! Time to shine!" |
| `bid_declined` | Inspector | "Your bid wasn't selected this time. Keep going!" |
| `bid_edited` | Job Poster | "Sarah updated their bid for 123 Main St" |
| `job_assigned` | Inspector | "The inspection is officially yours!" |
| `report_submitted` | Job Poster | "Report Ready! Review & release payment." |
| `report_approved` | Inspector | "Your report has been approved. Great job!" |
| `payment_released` | Inspector | "Ka-ching! $250 received for 123 Main St" |
| `review_received` | Either | "5-Star Review! Marcus says: 'Excellent...'" |
| `badge_earned` | User | "Achievement Unlocked! You earned 'First Inspection'" |
| `job_expired` | Job Poster | "Your job has expired. You can repost it." |
| `job_cancelled` | Inspector | "The job has been cancelled by the requester." |

**Notification Routing (Click Actions):**
```typescript
// src/lib/notifications.ts - getNotificationLink()
bid_received → /inspections/my-jobs?tab=received
bid_accepted → /inspections/spotlights/{jobId}
report_submitted → /inspections/jobs/{jobId}/report/view
report_approved → /inspections/spotlights/{jobId}
job_cancelled → /inspections/my-jobs?tab=cancelled
```

**Key Functions:**
- `createNotification(params)` - Create any notification type
- `fetchNotifications(limit, unreadOnly)` - Get user's notifications
- `getUnreadCount()` - Badge count for bell icon
- `markAsRead(id)` / `markAllAsRead()` - Mark notifications read
- `notifyBidReceived()`, `notifyBidAccepted()`, etc. - Theatrical helper functions

---

### ✅ MY POSTED JOBS DASHBOARD (For Job Posters)

**File:** `src/pages/inspections/MyPostedJobs.tsx`
**Route:** `/inspections/my-jobs`

**6 Tabs with Badge Counts:**
| Tab | Shows | Badge Color |
|-----|-------|-------------|
| Awaiting Bids | Open jobs with 0 bids | Gray |
| Bids Received | Open jobs with 1+ bids | **Red (urgent)** |
| In Progress | Assigned + in_progress jobs | Gray |
| Reports Ready | pending_review jobs | **Red (urgent)** |
| Completed | Completed jobs | Gray |
| Cancelled/Expired | Cancelled + expired jobs | Gray |

**Key Features:**
- URL parameter support: `?tab=received` for deep linking from notifications
- Inline bid display with expand/collapse per job card
- Accept/Decline bid actions with confirmation dialogs
- View Report button navigates to read-only report view
- Quick bid details dialog with inspector profile

---

### ✅ MY INSPECTION WORK DASHBOARD (For Inspectors)

**File:** `src/pages/inspections/MyInspectionWork.tsx`
**Route:** `/inspections/my-work`

**5 Tabs:**
| Tab | Shows |
|-----|-------|
| My Bids | All bids (pending, shortlisted) |
| Accepted - Action Required | Accepted bids where report not yet submitted |
| Reports Submitted | Jobs with pending_review status |
| Completed | Completed jobs |
| Declined | Declined bids |

**Key Features:**
- Quick stats header (Total Bids, Success Rate, Earnings, Avg Rating)
- "Complete Report" button navigates to InspectionReportBuilder
- Bid status badges with color coding
- Links to job details for each bid

**Sidebar Navigation:**
- Shows "My Inspection Work" for user types: `buyers_agent`, `inspector`, `building_inspector`

---

### ✅ INSPECTION REPORT BUILDER (16 Sections)

**File:** `src/pages/InspectionReportBuilder.tsx`
**Route:** `/inspections/jobs/:jobId/report`

**Comprehensive 16-Section Form:**
| # | Section | Key Fields |
|---|---------|------------|
| 0 | Inspection Details | Date, time, weather, shown by, duration, areas not accessed |
| 1 | Client Brief Match | Dynamic requirements from linked brief, status per requirement |
| 2 | First Impressions | Vibe slider (1-10), matches photos, gut feeling |
| 3 | Exterior | Street appeal, roof/walls/windows condition, parking, fencing |
| 4 | Living Areas | Condition, natural light, size accuracy, layout flow |
| 5 | Kitchen | Condition, age/style, appliances, storage, renovation estimate |
| 6 | Bathrooms | Count, ensuites, condition, ventilation, renovation estimate |
| 7 | Bedrooms | Count, master size, other sizes, storage |
| 8 | Other Spaces | Multi-select: Garage, Laundry, Study, Pool, Granny Flat, etc. |
| 9 | Neighbourhood | Street feel, traffic, parking, safety rating, amenities checklist |
| 10 | Red Flags | Multi-select: Structural, damp, smells, pests, noise, etc. |
| 11 | Standouts | Multi-select features, best single feature, "would you buy?" |
| 12 | Market Context | Days on market, price guide, pricing opinion, competition |
| 13 | Final Verdict | Overall score (1-10), recommendation, urgency, summary |
| 14 | For Agent | Questions to ask, second visit tips, negotiation suggestions |
| 15 | Review & Submit | Preview all sections, progress summary, submit button |

**Features:**
- **Auto-save** every 30 seconds with "Last saved" indicator
- **Progress tracking** with visual percentage bar
- **Time tracker** showing elapsed time
- **Photo upload** per section (planned, UI ready)
- **Client brief matching** with live score calculation
- **Section navigation** via sidebar with completion indicators
- **Mobile-friendly** with collapsible navigation
- **Authorization check** - only assigned inspector can access
- **Status transitions:**
  - `assigned` → `in_progress` (on first access)
  - `in_progress` → `pending_review` (on submit)
- **Celebration modal** with confetti animation on submit
- **Notification sent** to job poster on submit

---

### ✅ INSPECTION REPORT VIEW (For Job Posters)

**File:** `src/pages/InspectionReportView.tsx`
**Route:** `/inspections/jobs/:jobId/report/view`

**Read-Only Report Display:**
- Beautiful presentation of all 16 sections
- Final Verdict card at top with:
  - Overall Score (X/10)
  - Recommendation badge (Highly Recommend / Worth Considering / Not Recommended)
  - Urgency indicator (Act Fast / Normal / Take Time)
  - Brief Match percentage
- Client Brief Match breakdown with status icons (✓ meets / ⚠ partial / ✗ doesn't)
- Red Flags and Standouts side-by-side cards
- Inspector tips section (purple theme)
- Inspection details (date, time, weather, etc.)

**Approval Workflow:**
- "Approve Report" button (green, prominent)
- Confirmation dialog with agreed payment amount
- On approval:
  - Job status → `completed`
  - `completed_at` timestamp set
  - Inspector receives `report_approved` notification
- Navigate to `/inspections/my-jobs?tab=completed`

**Authorization:**
- Only job creator (requesting_agent_id) or admin can view
- Redirects unauthorized users with error toast

---

### 📁 FILES CREATED THIS SESSION

**New Files:**
1. `src/lib/notifications.ts` - Notification system core
2. `src/components/notifications/NotificationBell.tsx` - Bell icon component
3. `src/components/notifications/NotificationDropdown.tsx` - Dropdown component
4. `src/pages/inspections/MyPostedJobs.tsx` - Job poster dashboard
5. `src/pages/inspections/MyInspectionWork.tsx` - Inspector dashboard
6. `src/pages/InspectionReportBuilder.tsx` - 16-section report form
7. `src/pages/InspectionReportView.tsx` - Read-only report view
8. `docs/PROJECT_TODO.md` - Future development task list
9. `supabase/migrations/20260123020000_add_notification_system.sql` - Notification tables

**Modified Files:**
- `src/App.tsx` - Added routes for all new pages
- `src/components/layout/AppSidebar.tsx` - Added My Inspection Work nav item
- `src/components/layout/TopBar.tsx` - Added NotificationBell
- `src/pages/InspectionSpotlightDetail.tsx` - Bid submission with notifications
- `README.md` - Updated with documentation links

---

### 🔄 COMPLETE WORKFLOW (End-to-End)

**1. Job Poster Creates Job:**
```
/inspections/jobs/new → Creates inspection_job with status='open'
```

**2. Inspector Bids on Job:**
```
/inspections/spotlights/:id → Submits bid
→ Notification sent to job poster (bid_received)
```

**3. Job Poster Reviews & Accepts Bid:**
```
Click notification → /inspections/my-jobs?tab=received
Accept bid → job.status='assigned', job.assigned_inspector_id set
→ Notification sent to inspector (bid_accepted)
→ Notifications sent to other bidders (bid_declined)
```

**4. Inspector Completes Report:**
```
Click notification → /inspections/spotlights/:jobId
Click "Complete Report" → /inspections/jobs/:jobId/report
First access → job.status='in_progress'
Submit report → job.status='pending_review'
→ Notification sent to job poster (report_submitted)
```

**5. Job Poster Reviews & Approves Report:**
```
Click notification → /inspections/jobs/:jobId/report/view
Click "Approve Report" → job.status='completed'
→ Notification sent to inspector (report_approved)
```

---

### 📊 PAYMENT SYSTEM REQUIREMENTS (Documented)

Added to `docs/PROJECT_TODO.md`:

**1. Subscription Billing (Stripe):**
- Subscription tiers (Free/Basic/Premium)
- Monthly and annual billing
- Stripe Checkout integration
- Customer portal
- Upgrade/downgrade handling
- Cancellation flow
- Webhook handling
- Grace period for failed payments

**2. Marketplace Payments (Stripe Connect):**
- Platform takes 10% of each inspection fee
- Escrow: Hold payment until report approved
- Release 90% to inspector on approval
- Transfer 10% to platform account
- Stripe Connect onboarding for inspectors
- Refunds and dispute handling
- Earnings dashboard for inspectors
- Payout settings (bank account, schedule)

---

### 💡 TECHNICAL NOTES

**Raw Fetch Pattern (Supabase Workaround):**
All pages use raw `fetch()` instead of Supabase JS client due to client hanging issue:
```typescript
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

**Job Status Workflow:**
```
open → assigned → in_progress → pending_review → completed
                                              ↘ cancelled (any time before completed)
```

**Bid Status Workflow:**
```
pending → shortlisted → accepted
                     ↘ declined
       ↘ withdrawn (by inspector)
```

---

### 🎯 NEXT PRIORITIES

1. **Payment Integration** - Stripe subscriptions + Connect for marketplace
2. **Email Notifications** - Actually send emails via Resend API
3. **Review System** - Two-way reviews after job completion
4. **Photo Upload** - Implement section photos in report builder
5. **Visual Revamp** - Apply consistent design system across all pages

---

**Last Updated:** January 24, 2026
**Session Focus:** Complete Inspection Marketplace Workflow
**Commits This Session:**
- `3a5241c` feat: add read-only report view for job posters
- Plus 7 previous commits for notification system, dashboards, and report builder

---

## 📋 SESSION CHANGELOG - January 18, 2026

### Session Summary: Supabase Deadlock Fix, User Onboarding Flow & Profile Enhancements

This session resolved the root cause of the Supabase JS client hanging issue, implemented first-time user onboarding with a welcome video placeholder, and enhanced the profile settings with security information and professional accreditation.

---

### ✅ CRITICAL FIX: Supabase JS Client Deadlock Resolved

**Root Cause Identified:**
- The Supabase JS client was hanging indefinitely due to a **deadlock in the `onAuthStateChange` callback**
- When async Supabase methods (like `supabase.from().select()`) were awaited inside the callback, they blocked waiting for an internal auth lock that the callback itself was holding
- This is a known issue: [GitHub Issue #1620](https://github.com/supabase/supabase-js/issues/1620)

**Solution Applied in `src/contexts/AuthContext.tsx`:**
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // Defer async operations to avoid Supabase client deadlock
    setTimeout(async () => {
      await fetchProfile(session.user.id);
      // ... other async operations
      setLoading(false);
    }, 0);
  }
);
```

**Result:** All Supabase JS client operations now work correctly without hanging.

---

### ✅ USER SIGN-UP FLOW FIXES

**Issues Fixed:**
1. **Email Confirmation Required** - Disabled via Supabase Management API:
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/yrjtdunljzxasyohjdnw/config/auth" \
     -H "Authorization: Bearer sbp_..." \
     -d '{"mailer_autoconfirm": true}'
   ```

2. **RLS Policy Violations** - Fixed by using proper session tokens from signUp response

3. **Profile Creation** - Added `ensureEmailUserProfile()` function for email sign-ups

---

### ✅ FIRST-TIME USER ONBOARDING

**New Welcome Flow:**
1. First-time users are redirected to `/welcome` page
2. Welcome page shows onboarding video placeholder (video to be created)
3. After watching/skipping video, users continue to profile setup
4. Returning users see "Welcome back, [Name]" on dashboard

**Files Created/Modified:**
- `src/pages/Welcome.tsx` - New welcome page with video placeholder
- `src/components/dashboard/WelcomeHeader.tsx` - Added first-time user detection
- `src/App.tsx` - Added `/welcome` route

**First-Time Detection Logic:**
```typescript
// Uses localStorage per-user key
const hasVisitedKey = `user_${userId}_has_visited`;
const hasVisited = localStorage.getItem(hasVisitedKey);

if (!hasVisited) {
  localStorage.setItem(hasVisitedKey, 'true');
  navigate('/welcome');
}
```

---

### ✅ PROFILE EDIT ENHANCEMENTS

**New Sections Added to `src/pages/settings/ProfileEdit.tsx`:**

1. **Security Profile Card** - Shows current role and permissions
   - Displays role label (Administrator, Verified Professional, Pending Professional, Guest)
   - Lists all permissions granted by the role
   - Uses badge components for visual clarity

2. **Professional Accreditation Card** - For credential submission
   - Text field for entering professional credentials (license numbers, certifications)
   - Message explaining 24-hour review process
   - Only shown to Guest and Pending Professional roles

3. **Preferences Card** - Unit system selection
   - Radio buttons for Metric/Imperial
   - Updates user preference context

4. **First-Time Setup Banner** - Contextual welcome message
   - Shown when user arrives from onboarding flow
   - Uses React Router state: `isFirstTimeSetup`

---

### ✅ DATABASE MIGRATION

**File:** `supabase/migrations/20260118000000_add_professional_accreditation.sql`
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS professional_accreditation TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_accreditation ON public.profiles(professional_accreditation)
WHERE professional_accreditation IS NOT NULL;
```

---

### ✅ DANI'S APPROVAL CHECKLIST UPDATED

**New Item #15: Professional Accreditation Verification**

Added comprehensive questions for Dani to review:
- How do we verify buyers agent accreditation?
- How do we verify real estate agent accreditation?
- How do we verify other professionals (conveyancers, etc.)?
- What documentation should be required?
- Who on the team will do the verification?
- What happens if verification fails?
- Should we integrate with external verification services?
- Different requirements per country (AU/UK/US)?

---

### 📁 FILES MODIFIED THIS SESSION

1. `src/contexts/AuthContext.tsx` - Deadlock fix, email profile creation
2. `src/components/dashboard/WelcomeHeader.tsx` - First-time user redirect
3. `src/pages/settings/ProfileEdit.tsx` - Security profile, accreditation, preferences
4. `src/pages/Welcome.tsx` - New welcome page (created)
5. `src/pages/Index.tsx` - Pass userId to WelcomeHeader
6. `src/App.tsx` - Added /welcome route
7. `src/lib/permissions.ts` - Exported ROLE_PERMISSIONS
8. `docs/DANI_APPROVAL_CHECKLIST.md` - Added accreditation verification section
9. `supabase/migrations/20260118000000_add_professional_accreditation.sql` - New migration

---

**Last Updated:** January 18, 2026
**Session Focus:** Supabase fix, User onboarding, Profile enhancements

---

## 📋 SESSION CHANGELOG - January 16, 2026 (Evening Session)

### Session Summary: Complete Workflow Fix & Raw Fetch Migration

This evening session completed the migration of all critical pages from Supabase JS client to raw fetch, ensuring the entire inspection workflow functions without hanging.

---

### ✅ PAGES FIXED WITH RAW FETCH

**Core Workflow Pages (All Now Working):**

1. **`src/pages/CreateInspectionJob.tsx`** ✅
   - `fetchClientBriefs()` - GET briefs for dropdown
   - `handleSaveDraft()` - POST draft jobs
   - `handlePostJob()` - POST open jobs

2. **`src/pages/InspectionSpotlights.tsx`** ✅
   - Added DashboardLayout wrapper (was missing sidebar)
   - `fetchJobs()` - GET open jobs listing

3. **`src/pages/InspectionSpotlightDetail.tsx`** ✅
   - `fetchJobDetails()` - GET job, creator, brief, bids
   - `handleSubmitBid()` - POST new bids
   - Check for existing user bid
   - Added DashboardLayout wrapper

4. **`src/pages/InspectionReportBuilder.tsx`** ✅
   - `handleAutoSave()` - PATCH/POST reports (30-second auto-save)
   - `fetchJobAndReport()` - GET job, brief, existing report
   - `handleSaveDraft()` - PATCH/POST draft reports
   - `handleSubmit()` - PATCH/POST report + PATCH job status

5. **`src/pages/PostInspection.tsx`** ✅
   - `handleSubmit()` - POST inspection requests

**Previously Fixed (Earlier Session):**
- `src/pages/ClientBriefForm.tsx` ✅
- `src/pages/ClientBriefs.tsx` ✅
- `src/pages/ClientBriefDetail.tsx` ✅

**Not Yet Migrated (Admin Only - Low Priority):**
- `src/pages/Admin.tsx` - Admin dashboard, not in main workflow

---

### 🔧 RAW FETCH HELPER PATTERN

All pages now use this consistent pattern:

```typescript
// Helper to get auth headers for raw fetch (workaround for Supabase client hanging)
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

**Usage Examples:**
```typescript
// GET single object
const response = await fetch(
  `${supabaseUrl}/rest/v1/table?select=*&id=eq.${id}`,
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.pgrst.object+json', // Single object response
    },
  }
);

// POST new record
const response = await fetch(`${supabaseUrl}/rest/v1/table`, {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation', // Return inserted record
  },
  body: JSON.stringify(data),
});

// PATCH existing record
const response = await fetch(`${supabaseUrl}/rest/v1/table?id=eq.${id}`, {
  method: 'PATCH',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify(data),
});
```

---

### 📊 WORKFLOW STATUS

**Complete End-to-End Workflow Now Working:**

1. ✅ **Create Client Brief** → /briefs/new
2. ✅ **View Client Briefs** → /briefs
3. ✅ **View Brief Detail** → /briefs/:id
4. ✅ **Edit Client Brief** → /briefs/:id/edit
5. ✅ **Create Inspection Job** (linked to brief) → /inspections/jobs/new
6. ✅ **Browse Job Spotlights** → /inspections/spotlights
7. ✅ **View Job Detail & Submit Bid** → /inspections/spotlights/:id
8. ✅ **Submit Inspection Report** → /inspections/jobs/:jobId/report

---

### 📝 OUTSTANDING ISSUES

**Supabase JS Client (Root Cause Unknown):**
- All `supabase.from()` calls hang indefinitely
- Raw fetch to REST API works perfectly
- Issue NOT network, credentials, or database
- Needs deeper investigation (not blocking with workaround)

**Admin Page (Low Priority):**
- `Admin.tsx` still uses Supabase client
- Not critical - admin-only functionality
- Will be fixed if/when needed

---

**Last Updated:** January 16, 2026 - Evening
**Session Duration:** ~1 hour
**Files Changed:** 4 files modified (InspectionReportBuilder, PostInspection, + updates to PROJECT_CONTEXT.md)

---

## 📋 SESSION CHANGELOG - January 16, 2026 (Earlier Session)

### Session Summary: Supabase JS Client Debugging & Raw Fetch Workaround

This session focused on diagnosing and working around a critical Supabase JS client issue that was causing all database queries to hang indefinitely.

---

### 🔴 CRITICAL ISSUE DISCOVERED: Supabase JS Client Hanging

**Problem:**
- All Supabase JS client database operations (`supabase.from().select()`, `.insert()`, etc.) hang indefinitely
- Timeout after 5-30 seconds with no response
- Affects ALL pages using the Supabase client

**Diagnosis Process:**
1. Initially thought to be slow page loading → Added timeouts to queries
2. Discovered profile fetches timing out in AuthContext
3. Added ping test to ClientBriefForm → Ping also timed out
4. Tested raw `fetch()` to Supabase REST API → **Works perfectly (200 in 406ms)**
5. Tested `curl` from command line → **Works perfectly (200 response)**
6. Confirmed: Supabase URL and API key are correct
7. Confirmed: Database is healthy (SQL Editor in dashboard works)

**Root Cause:**
- The Supabase JS client library is broken/hanging for unknown reason
- NOT a database issue, NOT a credentials issue, NOT a network issue
- Raw HTTP requests work fine; only the JS client is affected
- Possibly related to: realtime subscriptions, WebSocket connection, or client state

**Status:** UNRESOLVED - Needs deeper investigation later

---

### ✅ WORKAROUND IMPLEMENTED: Raw Fetch for Database Operations

Since the Supabase JS client is broken, we implemented raw `fetch()` calls directly to the Supabase REST API.

**Pattern Used:**
```typescript
// Get auth token from localStorage (bypass broken client)
let accessToken = supabaseKey;
try {
  const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);
  if (storedSession) {
    const parsed = JSON.parse(storedSession);
    accessToken = parsed?.access_token || supabaseKey;
  }
} catch (e) {}

// Use raw fetch
const response = await fetch(`${supabaseUrl}/rest/v1/table_name?select=*`, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

**Files Updated with Raw Fetch Workaround:**

1. **`src/pages/ClientBriefForm.tsx`**
   - INSERT for creating briefs → `POST /rest/v1/client_briefs`
   - INSERT for locations → `POST /rest/v1/client_brief_locations`
   - Auth token retrieved from localStorage

2. **`src/pages/ClientBriefs.tsx`**
   - SELECT for listing briefs → `GET /rest/v1/client_briefs?select=*&order=updated_at.desc`
   - DELETE for removing briefs → `DELETE /rest/v1/client_briefs?id=eq.{id}`
   - Admin check for showing all vs own briefs

3. **`src/pages/ClientBriefDetail.tsx`**
   - SELECT single brief → `GET /rest/v1/client_briefs?select=*&id=eq.{id}`
   - Uses `Accept: application/vnd.pgrst.object+json` for single object response

---

### ✅ PAGE LOADING IMPROVEMENTS

**Problem:** Pages were hanging on "Loading..." for extended periods

**Fixes Applied:**

1. **`src/contexts/AuthContext.tsx`**
   - Implemented cache-first approach for profile loading
   - Uses localStorage cached profile immediately
   - Fetches fresh profile in background with 3-second timeout
   - Falls back to cached data if fetch fails

2. **`src/components/auth/ProtectedRoute.tsx`**
   - Max 1-second loading state before rendering
   - Doesn't block on slow profile fetches
   - Proceeds with cached profile data

3. **`src/pages/InspectionReportBuilder.tsx`**
   - Added `setLoading(false)` when user is null
   - Prevents infinite hang if not authenticated

---

### ✅ DATABASE MIGRATIONS

**Migration: `20260116010000_add_expiry_date_to_client_briefs.sql`**
```sql
ALTER TABLE public.client_briefs
ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE public.client_briefs
ADD COLUMN IF NOT EXISTS must_have_features TEXT[];

CREATE INDEX IF NOT EXISTS idx_client_briefs_expiry ON public.client_briefs(expiry_date);
```

**Reason:** ClientBriefForm was trying to insert `expiry_date` but column didn't exist.

---

### 📝 KNOWN ISSUES & PENDING WORK

**High Priority (Needs Investigation):**
1. **Supabase JS Client Hanging** - Root cause unknown
   - All `supabase.from()` calls hang indefinitely
   - Raw fetch works, so it's not network/credentials
   - May need to check Supabase JS version, realtime config, or client initialization

**Medium Priority (More Pages Need Raw Fetch):**
2. **Update remaining pages to use raw fetch workaround:**
   - `InspectionSpotlights.tsx`
   - `InspectionSpotlightDetail.tsx`
   - `InspectionReportBuilder.tsx`
   - `AuthContext.tsx` (profile fetch)
   - `Directory.tsx`
   - `Marketplace.tsx`
   - Other pages using Supabase client

**Low Priority (UI Enhancements):**
3. **ClientBriefDetail page** - Only shows basic requirements
   - All data IS saved, but detail page needs more UI sections
   - Should display: pool, garden, architecture, views, parking, etc.

---

### 🔧 DEBUGGING TOOLS ADDED

**ClientBriefForm now logs:**
```
[ClientBriefForm] Testing database connection...
[ClientBriefForm] Supabase URL: https://xxx.supabase.co
[ClientBriefForm] Key exists: true
[ClientBriefForm] Got access token from localStorage
[ClientBriefForm] Starting insert via fetch...
[ClientBriefForm] Insert completed in Xms, status: 201
```

---

### 📊 SESSION SUMMARY

| Task | Status |
|------|--------|
| Diagnose slow page loading | ✅ Complete |
| Fix AuthContext profile caching | ✅ Complete |
| Fix ProtectedRoute timeout | ✅ Complete |
| Diagnose Supabase client hanging | ✅ Identified (not fixed) |
| Implement raw fetch workaround | ✅ Complete (3 pages) |
| Add expiry_date migration | ✅ Complete |
| Create client brief | ✅ Working |
| View client briefs list | ✅ Working |
| View client brief detail | ✅ Working (basic fields) |
| Delete client brief | ✅ Working |

**What's Working Now:**
- Creating client briefs (via raw fetch)
- Listing client briefs (via raw fetch)
- Viewing brief details (via raw fetch, basic fields only)
- Deleting briefs (via raw fetch)
- Page loading is faster (cache-first + timeouts)

**What's NOT Working:**
- Supabase JS client (ALL operations hang)
- Pages not yet updated to raw fetch (inspection pages, etc.)
- Brief detail page missing advanced field display

---

**Last Updated:** January 16, 2026
**Session Duration:** ~2 hours
**Files Changed:** 6 files modified, 1 migration created

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

#### 0. Authentication & OAuth Improvements

- **Fix Google OAuth Branding in Google Cloud Console**
  - Issue: OAuth consent screen shows long code instead of "Agent Hub"
  - Solution: Update OAuth consent screen branding in Google Cloud Console
  - Add app logo and proper application name
  - Update app name and descriptions

- **Custom Domain Setup**
  - Issue: Google Sign-In shows "yrjtdunljzxasyohjdnw.supabase.co" instead of proper domain
  - Action: When we get a real domain (like agenthub.com.au):
    - Configure custom domain with Supabase
    - Update Google Cloud Console authorized origins
    - Update OAuth redirect URIs
    - Update Supabase project settings
  - Result: Professional domain name in OAuth flows

- **Update Admin Email**
  - Current: support@the-empowered-patient.org
  - Future: Update to proper Agent Hub domain email (e.g., admin@agenthub.com.au)
  - Update locations:
    - Seed scripts (seed-admin.mjs)
    - Google OAuth consent screen
    - Supabase project settings
    - Any hardcoded references in code

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

## 🔮 FUTURE TASKS & ENHANCEMENTS

### Authentication & Sign-In
- **Custom Domain Setup**
  - Configure real domain (e.g., agenthub.com.au) with Supabase
  - Update Google OAuth authorized origins and redirect URIs
  - Result: Google Sign-In shows proper domain instead of "yrjtdunljzxasyohjdnw.supabase.co"

- **Additional OAuth Providers**
  - **Apple Sign-In** - For future iOS app, seamless mobile experience
  - **LinkedIn Sign-In** - Perfect for professional network, import work history
  - **Microsoft Account** - Good for enterprise/business users

- **Update Admin Email**
  - Current: support@the-empowered-patient.org (temporary)
  - Future: admin@agenthub.com.au or support@agenthub.com.au
  - Update locations: seed scripts, Google OAuth consent, Supabase settings

- **Fix Google OAuth Branding**
  - Update OAuth consent screen in Google Cloud Console
  - Add professional app logo
  - Improve app name and descriptions
  - Publish OAuth app (remove "Testing" status)

### Notifications & Communication
- **SMS Notifications (Twilio Integration)**
  - Property alerts when matching listings arrive
  - Inspection confirmations and reminders
  - Important system notifications
  - Two-factor authentication via SMS

- **Email Notifications**
  - Welcome emails for new users
  - Weekly digest of new properties
  - Inspection request notifications
  - Connection requests and messages

- **Push Notifications**
  - Browser push for real-time updates
  - Mobile app notifications (future)

### AI & Automation
- **AI Property Descriptions**
  - Generate compelling property descriptions from photos and basic info
  - Market analysis and comparable properties
  - Highlight key features and selling points
  - Multiple tone options (professional, casual, luxury)

- **AI Client Brief Matching**
  - Automatically match properties to client briefs
  - Score properties based on client requirements
  - Smart recommendations for agents

- **Chatbot Support**
  - Answer common questions
  - Guide users through platform features
  - 24/7 availability

### Integrations & Business Tools
- **DocuSign Integration**
  - Digital contract signing for property transactions
  - Agent agreements and NDAs
  - Automatic document storage and tracking
  - Compliance and audit trails

- **Stripe Subscriptions**
  - Membership tiers (Free, Professional, Enterprise)
  - Monthly/annual billing
  - Feature gating based on subscription
  - Payment history and invoicing

- **CRM Integration**
  - Export contacts to popular CRMs
  - Sync client data
  - Lead tracking

- **Calendar Integration**
  - Google Calendar, Outlook sync
  - Inspection scheduling
  - Meeting coordination

### Platform Enhancements
- **Advanced Property Search**
  - Map-based search with drawing tools
  - Save searches and get alerts
  - Property comparison tool
  - Price history and market trends

- **Video Tours**
  - Upload and stream property videos
  - Virtual open homes
  - Agent introduction videos

- **Document Management**
  - Upload and organize property documents
  - Contract templates
  - Shared document library

- **Analytics Dashboard**
  - Property view statistics
  - Conversion tracking
  - Performance metrics for agents
  - Market insights

### Mobile Experience
- **Native Mobile Apps**
  - iOS and Android apps
  - Push notifications
  - Camera integration for property photos
  - Offline mode for property viewing

- **Progressive Web App (PWA)**
  - Install on home screen
  - Offline capability
  - Fast loading
  - App-like experience

### Branding & Logo Design
- **Main Logo Assets**
  - Full color logo (horizontal version for headers/banners)
  - Full color logo (stacked/vertical version for square spaces)
  - Design in vector format (SVG) for scalability

- **Favicon Package**
  - 16x16px - Browser tab icon (small)
  - 32x32px - Browser tab icon (standard)
  - 48x48px - Browser tab icon (high-res displays)
  - ICO format for cross-browser compatibility

- **Apple Device Icons**
  - 180x180px - Apple Touch Icon for iPhone/iPad home screen
  - Rounded corners applied automatically by iOS

- **Social Media Profile Pictures**
  - **Instagram:** 320x320px (display), 110x110px (profile thumbnail)
  - **Facebook:** 180x180px (profile), 820x312px (cover photo)
  - **LinkedIn:** 400x400px (profile/company logo), 1128x191px (company banner)
  - **Twitter/X:** 400x400px (profile), 1500x500px (header/banner)
  - All should be high-quality JPG or PNG format

- **Logo Variations for Different Contexts**
  - Full color on white background (primary version)
  - Full color on dark background (inverted/adjusted for visibility)
  - White/monochrome version (for dark backgrounds, overlays)
  - Black/monochrome version (for light backgrounds, print)
  - Icon only (no text) - for favicons, small spaces, app icons
  - Text only (no icon) - for narrow horizontal spaces

- **Open Graph (OG) Image**
  - 1200x630px - For link previews when sharing on social media
  - Shows when Agent Hub URLs are shared on Facebook, LinkedIn, Twitter, Slack, etc.
  - Should include logo, tagline, and attractive background
  - High-quality JPG format

- **Future App Icons (Mobile)**
  - iOS App Store icon: 1024x1024px
  - Android Play Store icon: 512x512px
  - Various app icon sizes for different devices (handled by build tools)
  - Adaptive icons for Android (separate foreground/background layers)

**Design Requirements:**
- Consistent brand identity across all formats
- Professional, minimal aesthetic matching our Notion/Linear design direction
- Use brand colors: Forest Green (#064E3B) and Rose Gold (#E8B4B8)
- Clean, modern typography (Inter font family preferred)
- Scalable vector graphics (SVG) for logos
- High-resolution exports for all raster formats (2x, 3x for retina displays)

### Logo Implementation on Website
Once logo assets are created, implement them across the platform:

- **Sidebar Branding**
  - Replace "Agent Hub" text with actual logo
  - Use horizontal version if space allows, or icon-only version for collapsed sidebar
  - Ensure logo is clickable and navigates to dashboard

- **Browser Favicon**
  - Add favicon.ico to public folder
  - Add favicon link tags to index.html
  - Include multiple sizes (16x16, 32x32, 48x48) for different browsers
  - Add Apple Touch Icon for iOS devices
  - Result: Our icon shows in browser tabs instead of generic icon

- **Authentication Pages**
  - Add logo to Sign In page (centered above form)
  - Add logo to Sign Up page (centered above form)
  - Add logo to password reset page
  - Add logo to email verification page
  - Use full color horizontal logo version

- **Email Templates**
  - Add logo to email header
  - Use in welcome emails for new users
  - Include in notification emails (property alerts, inspection confirmations)
  - Add to password reset emails
  - Add to system announcement emails
  - Host logo image on CDN or use base64 encoding

- **Top Bar (Navigation)**
  - Consider adding small logo or icon to top bar (if appropriate for design)
  - Alternative: Keep top bar minimal, logo only in sidebar

- **Open Graph Meta Tags**
  - Add OG meta tags to index.html and relevant pages
  - `<meta property="og:image" content="[og-image-url]" />`
  - `<meta property="og:title" content="Agent Hub - Professional Network for Buyers Agents" />`
  - `<meta property="og:description" content="..." />`
  - Result: When someone shares Agent Hub links on social media, it shows our logo and branding

- **PDF Exports and Documents**
  - Add logo to client brief PDFs
  - Include in property presentation exports
  - Add to inspection reports
  - Use in any system-generated documents
  - Position in header or footer with proper branding

- **Mobile App Splash Screen (Future)**
  - Full-screen logo on app launch
  - Animated fade-in for professional feel
  - Loading indicator below logo
  - Use stacked/vertical logo version for better fit

- **Error Pages**
  - Add logo to 404 Not Found page
  - Include on 500 Server Error page
  - Use on maintenance page

- **Marketing Pages (Future)**
  - Add logo to landing page
  - Include in footer of all pages
  - Use in feature showcase sections

**Technical Implementation Notes:**
- Store logo files in `public/images/logo/` directory
- Use SVG format for logos (scalable, sharp on all displays)
- Use PNG with transparency for social media and OG images
- Implement lazy loading for logo images where appropriate
- Add alt text for accessibility: "Agent Hub logo"
- Consider dark mode logo variant if implementing dark theme

### MARKETING & EXPLAINER CONTENT

**Video Script for Co-Owner Dani and Potential Buyers Agents:**

Create a comprehensive explainer video showcasing Agent Hub's unique features, with special emphasis on the Global Location/Service Area System.

**Key Feature to Explain: Global Location/Service Area System**

This is a differentiating feature that sets Agent Hub apart from competitors. The script should thoroughly explain:

1. **Multiple Service Area Levels** - How agents can specify where they work at various granularities:
   - **Radius-based:** "50km from Sydney CBD" or "150km from Melbourne"
   - **Suburb/Region:** "Eastern Suburbs, Sydney" or "Notting Hill, London"
   - **State/Province level:** "Anywhere in New South Wales" or "All of California"
   - **Country-wide:** "Anywhere in Australia" or "Anywhere in Canada"
   - **Global:** "I work internationally - anywhere in the world"

2. **Location Disambiguation** - How the system handles ambiguous searches:
   - Example: Searching "Paris" shows both:
     - Paris, Île-de-France, France ✓
     - Paris, Texas, United States ✓
   - Example: Searching "London" shows:
     - London, United Kingdom ✓
     - London, Ontario, Canada ✓
   - Visual demonstration: Type in search box, show dropdown with hierarchical display (City, State, Country)
   - Explain proximity biasing: Results near you appear first, but all countries are searchable

3. **Multiple Service Areas** - How agents can have several service areas:
   - Example: "I work in BOTH Sydney AND Melbourne"
   - Example: "I have a 100km radius from Brisbane AND I cover all of Gold Coast"
   - Example: International agent: "London, UK + New York, USA + Sydney, Australia"
   - Show the service area manager interface where agents add/remove areas
   - Explain the radius slider (5km to 250km for rural/regional coverage)
   - Show how agents can mix and match area types

4. **Priority System** - How primary service areas work:
   - First service area added is marked as "Primary"
   - Primary area shows prominently on agent profile
   - Agents can have unlimited additional service areas
   - Visual badge: "Primary" label on main service area

5. **Why This Is Better Than Competitors:**
   - **Truly Global:** Not restricted to one country (e.g., not "Australia only")
   - **Flexible:** Mix radius, suburbs, states, countries - whatever makes sense for your business
   - **Precise:** Use exact radius distances OR named regions
   - **Unlimited:** Add as many service areas as you need
   - **Smart Search:** Location disambiguation means you always find what you're looking for
   - **Future-proof:** Built for international expansion from day one
   - **B2B Professional:** Designed for agents who work across regions, not just local areas

**Script Tone & Style:**
- Friendly and approachable (this is Dani speaking to fellow agents)
- Professional but not overly corporate
- Use real examples: "Let's say you're based in Sydney but also take clients in Melbourne..."
- Show, don't just tell: Screen recordings of the feature in action
- Address pain points: "Tired of platforms that only let you pick ONE city? We get it."

**Visual Elements to Include:**
- Screen recording: Agent going to Profile Edit → Service Areas
- Screen recording: Adding a radius-based service area (searching for "Paris", selecting Paris, France, setting radius to 75km)
- Screen recording: Adding a second service area (showing "Sydney, Australia")
- Screen recording: The location search autocomplete showing international results
- Screenshot: Agent profile showing multiple service areas with Primary badge
- Comparison graphic: Agent Hub vs Competitor (showing flexibility)
- Map visualization (future): Service areas displayed on map

**Key Messages:**
- "Work where YOU want to work"
- "International from day one"
- "No more 'location not supported' errors"
- "Your business isn't limited to one suburb - neither are we"
- "Built for the modern, mobile buyers agent"

**Call to Action:**
- "Set up your service areas in under 2 minutes"
- "Join agents from Sydney, London, New York, and beyond"
- "Try it now - it's free for professionals"

**Deliverables:**
- [ ] Full video script (3-5 minutes)
- [ ] List of required screen recordings
- [ ] List of required screenshots
- [ ] Suggested B-roll footage (if any)
- [ ] Subtitle/caption text for social media versions
- [ ] Short version (60 seconds) for social media ads

---

**EXPLAINER VIDEO CONTENT - CLIENT BRIEF LOCATION SYSTEM WITH PRIORITIES:**

This is a key differentiator from other platforms! The script should explain:

1. **Client Brief Location System with Priorities** - How agents can specify client location preferences with three priority levels:
   - **Must-Have (Primary):** Client's top priority areas - properties MUST be in these locations
     - Example: "Richmond, VIC - 25km radius" + "South Yarra, VIC - Exact suburb only"
     - Visual: Gold/amber cards with star icon
     - Matching logic: Properties must match at least one must-have location

   - **Nice-to-Have (Secondary):** Client would consider these areas if the property is right
     - Example: "Geelong, VIC - 50km radius"
     - Visual: Blue cards with thumbs-up icon
     - Matching logic: Properties score higher if in nice-to-have areas, but not required

   - **Exclude (Blacklist):** Areas the client absolutely does NOT want to see
     - Example: "Dandenong, VIC" - client explicitly said no to this area
     - Visual: Red cards with ban icon
     - Matching logic: Properties in excluded areas are filtered out completely

2. **Radius vs Exact Suburb** - How agents can choose precision level:
   - **Radius-based:** "Within 25km of Richmond" - useful for flexible searches
     - Slider from 0-100km
     - Shows geographic circle on map (future feature)
   - **Exact suburb only:** "Only properties IN South Yarra" - no radius, precise match
     - Checkbox to disable radius
     - Matches only properties with exact city/suburb match

3. **Real-World Use Case Examples:**
   - **Example 1 - Young Family:**
     - Must-have: "Richmond (25km), Hawthorn (exact suburb)"
     - Nice-to-have: "Brighton (50km), Camberwell (10km)"
     - Exclude: "Dandenong, Frankston" (too far from family)

   - **Example 2 - Investment Buyer:**
     - Must-have: "Melbourne CBD (10km), Brisbane CBD (15km)"
     - Nice-to-have: "Sydney CBD (5km)" (if the numbers work)
     - Exclude: "Remote regional areas" (low rental demand)

   - **Example 3 - Relocating Professional:**
     - Must-have: "San Francisco, CA (50km)" (job location)
     - Nice-to-have: "Oakland, CA (25km), Berkeley, CA (20km)"
     - Exclude: "San Jose, CA" (too long commute)

4. **How This Helps Buyers Agents:**
   - **Save Time:** Automatically filter out irrelevant properties
   - **Match Accuracy:** System scores properties based on location priorities
   - **Client Satisfaction:** Show clients you understand their needs precisely
   - **Smart Recommendations:** Algorithm prioritizes must-have locations
   - **Clear Documentation:** Visual representation of client preferences
   - **Flexibility:** Different clients, different needs - system adapts

5. **Global Coverage:**
   - Works worldwide (Sydney, London, New York, Paris, Tokyo - anywhere!)
   - Uses Mapbox global location data
   - Consistent experience across countries
   - Location disambiguation: "Richmond, VIC" vs "Richmond, VA"

6. **Visual Demo Points:**
   - Screen recording: Creating a client brief, clicking "Location Preferences"
   - Screen recording: Searching for "Richmond", selecting Richmond, Victoria, Australia
   - Screen recording: Setting priority to "Must-have", adjusting radius slider to 25km
   - Screen recording: Adding "Geelong" as "Nice-to-have" with 50km radius
   - Screen recording: Adding "Dandenong" as "Exclude"
   - Screenshot: Final display showing three sections (must-have, nice-to-have, exclude) with color coding
   - Screenshot: Property matching results showing prioritized listings

**Key Messages:**
- "Understand your client's location preferences like never before"
- "Three-tier priority system: Must-have, Nice-to-have, Exclude"
- "Precise control with radius or exact suburb matching"
- "Works globally - from Sydney to San Francisco"
- "Save time, increase accuracy, delight clients"

**Why This Is Better Than Competitors:**
- **Priority Levels:** Not just "preferred suburbs" - actual priority ranking
- **Radius Control:** 0-100km slider for each location individually
- **Exclude Areas:** Explicitly filter out unwanted areas (competitors don't have this!)
- **Multiple Precision Levels:** Mix exact suburbs with radius-based areas
- **Global Coverage:** Not limited to one country or city database
- **Visual Clarity:** Color-coded cards make priorities obvious at a glance
- **Smart Matching:** Algorithm uses priorities to rank property matches

**Technical Excellence:**
- Real-time global location search powered by Mapbox
- PostGIS geographic database for radius calculations
- Smart matching algorithm considers all three priority tiers
- Fast, responsive interface
- Mobile-friendly design

---

**EXPLAINER VIDEO CONTENT - FIRST-TIME USER ONBOARDING FLOW:**

This is a key user experience feature that makes Agent Hub welcoming and professional from the very first interaction. The script should explain:

1. **The Welcome Experience** - What happens when a new user signs up:
   - **Step 1:** User signs up (via email or Google OAuth)
   - **Step 2:** Immediately redirected to beautiful Welcome page (`/welcome`)
   - **Step 3:** Welcome page greets them personally: "Welcome to Buyers Agent Hub, [First Name]!"
   - **Step 4:** Video placeholder explains the platform (Dani's video goes here!)
   - **Step 5:** User clicks "Continue to Profile Setup"
   - **Step 6:** Guided to complete their professional profile

2. **Welcome Page Features:**
   - **Personalized Greeting:** Uses the user's first name from their account
   - **Onboarding Video:** Placeholder for Dani's explainer video
   - **"I've understood the overview" Button:** Acknowledges video content
   - **What You'll Set Up Preview:** Shows three steps coming next:
     1. Profile Photo - "Add your professional photo"
     2. Service Areas - "Define where you operate"
     3. Credentials - "Verify your professional status"
   - **Continue Button:** Large, prominent CTA to profile setup
   - **Skip Option:** Discrete "Skip video and continue" link for eager users

3. **Profile Setup Flow:**
   - **First-Time Banner:** "Welcome! Let's get your profile set up..."
   - **Security Profile Display:** Shows their current role (Guest) and what it allows
   - **Professional Accreditation:** Text field to enter credentials for verification
   - **24-Hour Review Message:** Sets expectation for credential review
   - **Service Areas:** Global location system (covered in separate video)
   - **Preferences:** Metric/Imperial unit selection

4. **Returning User Experience:**
   - **No Welcome Page:** Returning users go straight to Dashboard
   - **"Welcome back, [Name]":** Personalized greeting on dashboard
   - **Full Access:** Based on their verified role and permissions

5. **Why This Matters:**
   - **Professional First Impression:** Users feel welcomed, not lost
   - **Guided Setup:** Clear path to completing their profile
   - **No Overwhelm:** One step at a time, not everything at once
   - **Trust Building:** Shows we're organized and professional
   - **Higher Completion Rates:** Guided flows = more complete profiles
   - **Expectation Setting:** Users know what's coming next

6. **Visual Demo Points:**
   - Screen recording: New user clicking "Sign Up"
   - Screen recording: Welcome page appearing with personalized greeting
   - Screen recording: Video placeholder area (where Dani's video will play)
   - Screen recording: "What you'll set up" cards with numbered steps
   - Screen recording: Clicking "Continue to Profile Setup"
   - Screen recording: Profile page with first-time setup banner
   - Screen recording: Entering professional accreditation
   - Screenshot: Dashboard showing "Welcome back, [Name]" for returning user

**Key Messages:**
- "We guide you every step of the way"
- "Your professional profile in minutes, not hours"
- "Watch, learn, set up - it's that simple"
- "First impressions matter - and so do you"

**Video Placeholder Content (What Dani Should Cover):**
- Welcome to Buyers Agent Hub
- What the platform does (network, collaborate, grow)
- Quick overview of key features:
  - Agent Directory - Find and connect with professionals
  - Property Marketplace - Share off-market listings
  - Inspection Spotlights - Post and bid on inspection jobs
  - Client Briefs - Manage client requirements
- What to set up next (profile, service areas, credentials)
- How verification works (submit credentials → 24hr review → full access)
- Call to action: "Let's get you set up!"

**Technical Implementation:**
- Route: `/welcome` - Welcome page with video
- Route: `/settings/profile` - Profile setup (receives `isFirstTimeSetup` state)
- Detection: localStorage per-user key (`user_${userId}_has_visited`)
- Redirect: WelcomeHeader component handles first-time detection
- Files: `src/pages/Welcome.tsx`, `src/components/dashboard/WelcomeHeader.tsx`

---

## 🎭 PROPERTY SPOTLIGHT - INSPECTION MARKETPLACE

### Feature Overview
A theatrical inspection marketplace where buyers agents can post inspection jobs and local inspectors can bid on them. Think Airtasker meets property inspections.

### Implementation Status (January 15, 2026)

**✅ COMPLETED PHASES:**

#### Phase 1: Database Foundation
- `inspection_jobs` - Job postings with property details, budget, status workflow
- `inspection_bids` - Bids from inspectors with proposed amounts/dates
- `inspection_reports` - Comprehensive reports with 12+ comment fields
- `inspection_payments` - 10% platform fee calculations
- `inspection_reviews` - Two-way rating system (requester ↔ inspector)
- `inspection_badges` - Gamification achievements (16 badge types)
- Full RLS policies for all tables
- Migration: `supabase/migrations/20260114010000_create_inspection_marketplace_tables.sql`

#### Phase 2: Job Posting Form
- `src/pages/CreateInspectionJob.tsx`
- Multi-step wizard (Property → Requirements → Budget → Review)
- Client brief integration (purple theme for brief-linked jobs)
- General area booking option (address not yet confirmed)
- Urgency levels: Standard, Urgent, Express
- Route: `/inspections/jobs/new`

#### Phase 3: Job Board
- `src/pages/InspectionSpotlights.tsx`
- Card-based job listing with urgency badges
- Filter by location, budget, urgency
- General area bookings shown with blue indicator

#### Phase 4: Job Detail Page
- `src/pages/InspectionSpotlightDetail.tsx`
- Full job details with Express Interest button
- Client brief requirements displayed (if linked)
- Bid submission dialog
- Route: `/inspections/spotlights/:id`

#### Phase 5: Bidding System
- Inspectors submit proposed amount + date + message
- Job creators see all bids with inspector details
- Bid status workflow: pending → shortlisted → accepted/declined

#### Phase 6: Inspection Report Builder ✅ (January 15, 2026)
- `src/pages/InspectionReportBuilder.tsx`
- **8 sections** covering all property aspects:
  1. First Impressions (vibe slider, matches photos, gut feeling)
  2. Exterior (roof, walls, garden condition dropdowns)
  3. Interior (Living, Kitchen, Bathrooms, Bedrooms, Other Spaces)
  4. Neighbourhood (street feel, traffic, safety rating, amenities checklist)
  5. Red Flags & Concerns (6 checkboxes with red highlight when selected)
  6. Standout Features (12 feature checkboxes, "would you buy?")
  7. Final Verdict (overall score 1-10, recommendation - REQUIRED)
  8. Additional Comments (questions for agent, second visit tips)
- **14 comment textarea fields** (all with rows=5-8 for detailed input)
- **Auto-save every 30 seconds** with timestamp indicator
- **Client Brief display** at top when job is linked (purple theme)
- **Celebration dialog** with party popper animation on submit
- **Step navigation** with clickable progress bar
- Route: `/inspections/jobs/:jobId/report`

### Database Schema: inspection_reports
```sql
-- Key fields (see full schema in migration file)
first_impression_vibe INTEGER (1-10)
matches_photos TEXT ('yes'|'mostly'|'no')
gut_feeling_rating INTEGER (1-10)
first_impression_comments TEXT

exterior_roof_condition TEXT
exterior_walls_condition TEXT
exterior_garden_condition TEXT
exterior_comments TEXT

interior_living_condition TEXT
interior_living_natural_light TEXT ('dark'|'average'|'bright'|'amazing')
interior_living_comments TEXT
interior_kitchen_comments TEXT
interior_bathroom_comments TEXT
interior_bedroom_comments TEXT
interior_other_spaces TEXT[] -- array
interior_other_comments TEXT

neighbourhood_street_feel TEXT ('quiet'|'moderate'|'busy')
neighbourhood_traffic_noise TEXT
neighbourhood_safety_rating INTEGER (1-5)
neighbourhood_amenities TEXT[] -- array
neighbourhood_comments TEXT

has_structural_concerns BOOLEAN
has_damp_mold_signs BOOLEAN
has_unusual_smells BOOLEAN
has_pest_signs BOOLEAN
has_noise_issues BOOLEAN
has_access_issues BOOLEAN
concerns_comments TEXT

standout_features TEXT[] -- array
best_feature TEXT
would_personally_buy TEXT ('yes'|'maybe'|'no')
standout_comments TEXT

overall_score INTEGER (1-10) NOT NULL
recommendation TEXT ('highly_recommend'|'worth_considering'|'not_recommended') NOT NULL
summary_comments TEXT NOT NULL

additional_comments TEXT
questions_to_ask_agent TEXT
second_visit_tips TEXT
```

### Completed Phases
- **Phase 1-6:** Database, Job Posting, Job Board, Job Detail, Bidding, Report Builder ✅
- **Phase 7:** Report Viewer - Display submitted reports to job creators ✅ (January 24, 2026)
  - `src/pages/InspectionReportView.tsx`
  - Route: `/inspections/jobs/:jobId/report/view`
  - Read-only beautiful display of all report sections
  - Approve Report workflow (job → completed, notify inspector)

### Next Phases (To Be Built)
- **Phase 8:** Payment Integration - Stripe subscriptions + Connect for marketplace escrow
- **Phase 9:** Review System - Two-way reviews after job completion
- **Phase 10:** Badge Awards - Automatic badge awarding based on milestones
- **Phase 11:** Email Notifications - Send actual emails via Resend API

---

**Last Updated:** January 24, 2026
**Project Status:** Active Development - Core Features Complete, OAuth Implemented, Global Location System Implemented, Client Brief Location System with Priorities Implemented, Inspection Marketplace Phase 7 Complete (Full Workflow Working)
