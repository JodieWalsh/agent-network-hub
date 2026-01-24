# Technical Documentation - Buyers Agent Hub

This document provides technical details about the platform architecture, features, and implementation decisions.

---

## Table of Contents

1. [User Authentication & Profiles](#user-authentication--profiles)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Inspection Jobs System](#inspection-jobs-system)
4. [My Posted Jobs Dashboard](#my-posted-jobs-dashboard)
5. [Admin Dashboard](#admin-dashboard)
6. [Location Autocomplete](#location-autocomplete)
7. [Database Migrations](#database-migrations)
8. [Key Files Reference](#key-files-reference)

---

## User Authentication & Profiles

### Authentication Flow

The platform uses Supabase Auth for authentication with support for:
- Email/password signup with email confirmation
- Google OAuth sign-in

**Key file:** `src/contexts/AuthContext.tsx`

### Profile Creation

Profiles are created in the `profiles` table when users sign up. The profile includes:
- `id` - Matches the auth.users id
- `email` - User's email address
- `full_name` - Display name
- `user_type` - Professional type (buyers_agent, real_estate_agent, etc.)
- `role` - Permission role (guest, verified_professional, admin)
- `approval_status` - Approval state (pending, approved, rejected)
- `city` - User's city (with autocomplete)
- `home_base_address` - Detailed suburb/location with coordinates

### First-Time Setup Flow

1. User signs up and confirms email
2. Redirected to `/settings/profile` with `isFirstTimeSetup: true` state
3. User completes profile (photo, location, professional details)
4. On "Save Changes", redirected to Dashboard (`/`)

**Implementation:** `src/pages/settings/ProfileEdit.tsx` - Line 230-233

### Orphaned Profile Protection

A database trigger automatically deletes profiles when users are deleted from `auth.users`:

```sql
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
```

**Migration:** `supabase/migrations/20260123010000_cleanup_orphaned_profiles.sql`

---

## User Roles & Permissions

### Role Hierarchy

| Role | Description | Approval Status |
|------|-------------|-----------------|
| `guest` | New users, limited access | pending |
| `pending_professional` | Submitted credentials for review | pending |
| `verified_professional` | Admin-approved, full access | approved |
| `admin` | Full administrative access | approved |

### Sidebar Display

The sidebar shows the user's status based on their role:
- **Guest** or **pending approval** → Shows "Guest"
- **Admin** → Shows "Administrator"
- **Verified professional** → Shows their user type (e.g., "Buyers Agent")

**Implementation:** `src/components/layout/AppSidebar.tsx` - `getUserType()` function

### Permission System

Permissions are defined in `src/lib/permissions.ts`:
- `CAN_VIEW_DIRECTORY` - Browse agent directory
- `CAN_POST_INSPECTIONS` - Create inspection jobs
- `CAN_BID_ON_INSPECTIONS` - Submit bids on jobs
- `CAN_MANAGE_CLIENT_BRIEFS` - Create/manage client briefs
- `CAN_SUBMIT_PROPERTY` - Add properties to marketplace

---

## Inspection Jobs System

### Overview

Buyers agents can post inspection jobs (called "Spotlights") for properties they need inspected. Other agents can bid on these jobs.

### Job Status Flow

```
open → in_negotiation → assigned → in_progress → pending_review → completed
                    ↘ cancelled
                    ↘ expired
```

### Database Tables

- `inspection_jobs` - The job postings
- `inspection_bids` - Bids submitted by inspectors
- `inspection_bid_history` - Audit trail of bid changes

### Bid Transparency

Every bid change is logged with:
- Previous and new values
- Timestamp
- Reason for change

This creates accountability and trust between agents.

---

## My Posted Jobs Dashboard

**Location:** `/inspections/my-jobs`
**File:** `src/pages/inspections/MyPostedJobs.tsx`

### Features

1. **Tab-based organization:**
   - Awaiting Bids - Open jobs with no bids
   - Bids Received - Jobs with pending bids (urgent indicator)
   - In Progress - Assigned/active inspections
   - Reports Ready - Completed, awaiting review
   - Completed - Finished jobs
   - Cancelled/Expired - Inactive jobs

2. **Inline Bid Display:**
   - Bids are shown directly on job cards (expandable)
   - Auto-expands on "Bids Received" tab
   - Shows inspector name, price, proposed date, and message preview

3. **Click-to-View Bid Details:**
   - Click anywhere on a bid card to see full details
   - Dialog shows: inspector info, proposed price/date, full message, local knowledge, experience
   - Accept/Decline buttons in dialog

4. **Quick Actions per Status:**
   - Awaiting: Edit, Cancel
   - Bids Received: Edit Job, Accept/Decline bids
   - In Progress: View Details, Contact
   - Reports Ready: View Report, Release Payment
   - Completed: View Report, Leave Review

### Sidebar Navigation

The "My Posted Jobs" link appears conditionally in the sidebar only if the user has posted at least one job.

**Implementation:** `src/components/layout/AppSidebar.tsx` - `hasPostedJobs` state

---

## Admin Dashboard

**Location:** `/admin`
**File:** `src/pages/Admin.tsx`

### Features

1. **Pending Users Tab:**
   - Shows users with `approval_status = 'pending'`
   - Displays professional accreditation details
   - Approve/Reject actions with rejection reason dialog

2. **Pending Properties Tab:**
   - Shows properties awaiting approval
   - View Details modal for full review
   - Approve/Reject with reason

3. **Platform Stats Tab:**
   - Total users, verified professionals
   - Pending approvals count
   - Property statistics

4. **All Users Tab:**
   - Complete user list with email addresses
   - Role badges and status
   - "Make Admin" action for promoting users

5. **Refresh Button:**
   - Manual refresh to reload fresh data from database
   - Spinning icon during loading

---

## Location Autocomplete

### Implementation

Location autocomplete uses **Mapbox Geocoding API** via the `LocationSearch` component.

**Key files:**
- `src/components/location/LocationSearch.tsx` - Reusable autocomplete component
- `src/lib/mapbox-geocoder.ts` - Mapbox API integration

### Features

- Real-time search suggestions as user types
- Debounced API calls (250ms)
- Hierarchical display (e.g., "Sydney, New South Wales, Australia")
- Coordinates extraction for mapping
- Optional "Use my location" geolocation button

### Usage

```tsx
<LocationSearch
  value={location}
  onChange={setLocation}
  placeholder="Search for your city..."
  types={['place', 'region']}  // Filter by place type
/>
```

### Place Types

- `place` - Cities, towns
- `locality` - Suburbs, neighborhoods
- `region` - States, provinces
- `address` - Street addresses

### City Field

The city field in profile setup uses LocationSearch with `types={['place', 'region']}` for city-level autocomplete.

**File:** `src/pages/settings/ProfileEdit.tsx` - Lines 383-392

---

## Database Migrations

### Migration Files

Located in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `20260118000000_add_professional_accreditation.sql` | Added accreditation field for verification |
| `20260118010000_add_inspection_bid_history.sql` | Audit trail for bid changes |
| `20260118020000_fix_orphaned_profiles_and_approval_flow.sql` | Clean up orphaned profiles, fix approval workflow |
| `20260118030000_add_email_to_profiles.sql` | Added email column to profiles table |
| `20260123010000_cleanup_orphaned_profiles.sql` | Cleanup + auto-delete trigger for future protection |

### Running Migrations

```bash
npx supabase db push
```

### Orphaned Profile Cleanup

The cleanup migration:
1. Deletes inspection_bids from orphaned users
2. Deletes inspection_jobs from orphaned users
3. Deletes orphaned profiles
4. Creates trigger to auto-delete profiles when auth.users are deleted

---

## Key Files Reference

### Core Components

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route definitions |
| `src/contexts/AuthContext.tsx` | Authentication state management |
| `src/components/layout/AppSidebar.tsx` | Navigation sidebar |
| `src/components/layout/DashboardLayout.tsx` | Main layout wrapper |

### Pages

| File | Route | Purpose |
|------|-------|---------|
| `src/pages/Index.tsx` | `/` | Dashboard |
| `src/pages/Admin.tsx` | `/admin` | Admin dashboard |
| `src/pages/settings/ProfileEdit.tsx` | `/settings/profile` | Profile editing |
| `src/pages/inspections/MyPostedJobs.tsx` | `/inspections/my-jobs` | Job management |
| `src/pages/InspectionSpotlights.tsx` | `/inspections/spotlights` | Browse jobs |
| `src/pages/CreateInspectionJob.tsx` | `/inspections/jobs/new` | Post new job |

### Location Components

| File | Purpose |
|------|---------|
| `src/components/location/LocationSearch.tsx` | Mapbox autocomplete input |
| `src/lib/mapbox-geocoder.ts` | Mapbox API wrapper |

### Permission System

| File | Purpose |
|------|---------|
| `src/lib/permissions.ts` | Role/permission definitions |
| `src/components/auth/ProtectedRoute.tsx` | Route protection wrapper |

---

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

---

## Testing Two Users Locally

To test flows involving two users (e.g., job poster and bidder):

1. **Use different browsers:** Chrome for User A, Firefox/Edge for User B
2. **Use incognito window:** Regular window for User A, Incognito (Ctrl+Shift+N) for User B
3. **Use browser profiles:** Each Chrome profile has separate sessions

---

*Last updated: January 2026*
