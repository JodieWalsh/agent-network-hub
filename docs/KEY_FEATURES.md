# Key Features - Buyers Agent Hub

## Platform Features

---

## 💳 BUILT-IN PAYMENTS

*(Coming soon - Stripe integration for secure payments)*

---

## 🔍 TRANSPARENT BID SYSTEM

Professional-grade bidding with full accountability:

**Features:**
- Agents can edit pending bids (update price, date, message)
- Every change requires a reason - no silent edits
- Full audit trail stored in database (inspection_bid_history table)
- Job creators can see how bids evolved over time
- Builds trust through transparency

**How it works:**
1. Agent submits initial bid
2. If they need to change it, click "Edit Bid"
3. Update amount/date/message as needed
4. Must provide reason for change (visible to job creator)
5. All changes logged with timestamps

**Why it matters:**
- Professional accountability
- Clear negotiation history
- Dispute prevention
- Trust building between agents

---

---

## 📋 MY POSTED JOBS DASHBOARD

Comprehensive job management for buyers agents:

**Features:**
- Tab-based organization (Awaiting Bids, Bids Received, In Progress, Reports Ready, Completed, Cancelled)
- Inline bid display - see all bids directly on job cards
- Click-to-view bid details - full inspector info, message, experience
- Quick actions per job status (Edit, Cancel, Accept Bid, View Report, etc.)
- Urgent indicators for jobs needing attention
- Conditional sidebar link (only shows if user has posted jobs)

**Location:** `/inspections/my-jobs`

---

## 👤 USER ROLE SYSTEM

Clear role-based access with visual indicators:

**Roles:**
- **Guest** - New users awaiting approval (limited access)
- **Verified Professional** - Admin-approved agents (full access)
- **Administrator** - Full platform management

**Features:**
- Sidebar shows role status (Guest, Administrator, or user type)
- Professional accreditation submission for verification
- Admin approval workflow with rejection reasons
- Automatic profile cleanup when users are deleted

---

## 🗺️ LOCATION AUTOCOMPLETE

Smart location search powered by Mapbox:

**Features:**
- Real-time suggestions as you type
- City, suburb, and address-level search
- Coordinates stored for mapping features
- Works across all browsers (Chrome, Edge, Firefox, Safari)

**Used in:**
- Profile setup (City and Suburb fields)
- Service area management
- Property address search
- Inspection job locations
- Client brief locations

---

## 🔐 ADMIN DASHBOARD

Centralized platform management:

**Features:**
- Pending user approvals with accreditation review
- Pending property approvals with detail view
- Platform statistics and metrics
- All users list with role management
- Make Admin functionality for promoting users
- Refresh button for real-time data

**Location:** `/admin` (admin-only access)

---

## 🔔 IN-APP NOTIFICATION SYSTEM

Multi-channel notification architecture with theatrical messaging:

**In-App Notifications:**
- NotificationBell in sidebar with unread count badge
- Dropdown panel showing recent 10 notifications
- Click-to-navigate to relevant page
- Mark as read / Mark all as read functionality
- Auto-polling every 30 seconds for new notifications

**Notification Types:**
- Bid received (when someone bids on your job)
- Bid accepted (when your bid is chosen)
- Bid declined (when your bid is not selected)
- Job assigned (when you're assigned to a job)
- Report submitted (when inspector submits report)
- Payment released (when funds are paid)
- Review received (when you get a review)
- Badge earned (gamification achievement)
- Job expired / cancelled (status changes)

**Notification Preferences (Profile Settings):**
- Email master toggle + per-type toggles
- Weekly activity digest option
- Quiet hours configuration (start/end time)
- Push & SMS marked as "Coming Soon"

**Technical Details:**
- Database: `notifications` and `notification_preferences` tables
- RLS policies for secure user-specific access
- Default preferences auto-created on signup
- Theatrical messaging style for engagement

---

## 🚀 COMING SOON

Additional features in development...
