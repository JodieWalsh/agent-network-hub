# Communication System Implementation Plan
## Buyers Agent Hub - Messages, Forums, Notifications & Gamification

**Created:** 23 January 2026
**Status:** In Progress
**Current Phase:** Phase 1

---

## OVERVIEW

This document outlines the implementation plan for the complete communication system, including:
- In-app notifications (bell icon) - **DONE**
- Dashboard Recent Activity feed
- Direct messaging between users
- Community forums
- Gamification integration

---

## PHASE SUMMARY

| Phase | Feature | Status | Priority |
|-------|---------|--------|----------|
| **0** | Notification System (Bell Icon) | ✅ COMPLETE | - |
| **1** | Dashboard Recent Activity | 🔄 IN PROGRESS | High |
| **2** | Direct Messaging | ⏳ Pending | High |
| **3** | Forums | ⏳ Pending | Medium |
| **4** | Gamification Hub | ⏳ Pending | Medium |
| **5** | Real-time & Polish | ⏳ Pending | Low |

---

## PHASE 0: NOTIFICATION SYSTEM ✅ COMPLETE

**What was built:**
- `notifications` database table with RLS
- `notification_preferences` database table with RLS
- `NotificationBell` component in sidebar
- Notification helper functions in `src/lib/notifications.ts`
- Notifications triggered on: bid placed, bid accepted, bid declined, job cancelled
- Notification preferences UI in Profile Settings
- Default preferences created on signup

**Files created/modified:**
- `supabase/migrations/20260123020000_add_notification_system.sql`
- `src/lib/notifications.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/settings/ProfileEdit.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/InspectionSpotlightDetail.tsx`
- `src/pages/inspections/MyPostedJobs.tsx`

---

## PHASE 1: DASHBOARD RECENT ACTIVITY 🔄 IN PROGRESS

**Goal:** Display notifications and activity in a rich card format on the Dashboard

### Tasks

- [ ] **1.1** Create `RecentActivity` component
  - Query notifications table for current user
  - Display in rich card format with icons, timestamps, actions
  - Show last 5-10 items with "View All" link

- [ ] **1.2** Add to Dashboard layout
  - Place in appropriate position on Index.tsx
  - Responsive design for mobile/desktop

- [ ] **1.3** Create Activity page (View All)
  - Full paginated list of all activity
  - Filter by type (bids, messages, badges, etc.)

- [ ] **1.4** Test thoroughly
  - Verify notifications appear after bid actions
  - Test empty state
  - Test loading state

### UI Design

```
┌─────────────────────────────────────────────────────────────┐
│  Recent Activity                                [View All →]│
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔔  Sarah Chen bid on your job              2h ago    │ │
│  │     123 Smith St, Marrickville • $250                 │ │
│  │     [View Bid]                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✅  Your bid was accepted!                 Yesterday  │ │
│  │     45 Ocean Ave, Bondi • $300                        │ │
│  │     [View Job]                                        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 2: DIRECT MESSAGING ⏳ PENDING

**Goal:** Enable user-to-user communication with context linking

### Tasks

- [ ] **2.1** Database migration
  - `conversations` table
  - `messages` table
  - `conversation_participants` table (for unread counts)
  - RLS policies

- [ ] **2.2** Messaging helpers
  - `src/lib/messaging.ts`
  - Create/get conversation
  - Send message
  - Mark as read
  - Get unread count

- [ ] **2.3** Messages page
  - Conversation list (left panel)
  - Conversation view (right panel)
  - Message composer
  - Route: `/messages`

- [ ] **2.4** Integration points
  - "Message" button on bid cards
  - "Message" button on agent profiles
  - "Message Inspector" on assigned jobs

- [ ] **2.5** Notifications
  - Notify on new message received
  - Unread badge in sidebar

- [ ] **2.6** Testing
  - Send/receive messages between users
  - Context linking works
  - Unread counts accurate

### Database Schema

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES inspection_jobs(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  brief_id UUID REFERENCES client_briefs(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (conversation_id, user_id)
);
```

---

## PHASE 3: FORUMS ⏳ PENDING

**Goal:** Community discussion platform with categories and threads

### Tasks

- [ ] **3.1** Database migration
  - `forum_categories` table
  - `forum_threads` table
  - `forum_replies` table
  - `forum_reactions` table
  - `forum_follows` table
  - RLS policies

- [ ] **3.2** Forum helpers
  - `src/lib/forums.ts`
  - CRUD for threads/replies
  - Reactions
  - Follow/unfollow

- [ ] **3.3** Forums index page
  - Category list with counts
  - Latest threads
  - Route: `/forums`

- [ ] **3.4** Category page
  - Thread list for category
  - Create thread button
  - Route: `/forums/:categorySlug`

- [ ] **3.5** Thread detail page
  - Original post
  - Replies
  - Reply composer
  - Reactions
  - Route: `/forums/:categorySlug/:threadId`

- [ ] **3.6** Create thread page
  - Title, content, category selection
  - Route: `/forums/new`

- [ ] **3.7** Notifications
  - Notify on reply to followed thread
  - Notify on reaction received

- [ ] **3.8** Seed data
  - Create default categories
  - Welcome thread from admin

- [ ] **3.9** Testing
  - Create threads and replies
  - Reactions work
  - Following/notifications work

### Forum Categories

| Category | Slug | Description | Admin Only |
|----------|------|-------------|------------|
| Announcements | announcements | Platform updates and news | Yes |
| Tips & Best Practices | tips | Share your expertise | No |
| Market Discussion | market | Discuss local markets | No |
| Questions & Help | questions | Ask the community | No |
| Tools & Tech | tools | Apps and technology | No |

---

## PHASE 4: GAMIFICATION HUB ⏳ PENDING

**Goal:** Integrate gamification with communication + dedicated gamification page

### Tasks

- [ ] **4.1** Database updates
  - Add forum-related badges
  - Add `point_transactions` table
  - Add `category` to badges table

- [ ] **4.2** Forum gamification
  - Points for creating threads (+5)
  - Points for replies (+2)
  - Points for receiving likes (+1)
  - Points for receiving helpful (+3)
  - Points for solution marked (+10)

- [ ] **4.3** Messaging gamification
  - Track response times
  - "Quick Responder" badge

- [ ] **4.4** Gamification notifications
  - Badge earned notifications
  - Points milestone notifications

- [ ] **4.5** Gamification hub page
  - All badges (earned + available)
  - Points history
  - Leaderboard
  - Route: `/gamification` or `/achievements`

- [ ] **4.6** Profile integration
  - Show badges on profile
  - Show badges in forum posts
  - Show badges in messages

- [ ] **4.7** Testing
  - Points awarded correctly
  - Badges unlock at thresholds
  - Leaderboard accurate

### Forum Badges

| Badge | Requirement | Points |
|-------|-------------|--------|
| First Post | Create first thread | - |
| Conversation Starter | Create 10 threads | - |
| Helpful Hand | Receive 10 helpful reactions | - |
| Thought Leader | Receive 50 helpful reactions | - |
| Top Contributor | 100+ posts/replies | - |
| Problem Solver | 5 replies marked as solution | - |

### Forum Points

| Action | Points |
|--------|--------|
| Create a thread | +5 |
| Reply to a thread | +2 |
| Receive a "Like" | +1 |
| Receive a "Helpful" | +3 |
| Receive an "Insightful" | +5 |
| Reply marked as "Solution" | +10 |

---

## PHASE 5: REAL-TIME & POLISH ⏳ PENDING

**Goal:** Make everything feel instant and polished

### Tasks

- [ ] **5.1** Supabase Realtime
  - Subscribe to notifications table
  - Subscribe to messages table
  - Subscribe to forum_replies table

- [ ] **5.2** Typing indicators
  - Show when someone is typing in messages

- [ ] **5.3** Online status
  - Show online/offline/away status

- [ ] **5.4** Search
  - Search messages
  - Search forum threads

- [ ] **5.5** Email notifications
  - Integrate with Resend or similar
  - Send emails based on preferences
  - Daily/weekly digest option

- [ ] **5.6** Performance optimization
  - Pagination everywhere
  - Lazy loading
  - Caching where appropriate

- [ ] **5.7** Mobile polish
  - Test all features on mobile
  - Responsive improvements

---

## TESTING CHECKLIST

### Phase 1 Testing
- [ ] Activity shows on dashboard
- [ ] Empty state displays correctly
- [ ] Loading state works
- [ ] Click through to relevant pages
- [ ] Mobile responsive

### Phase 2 Testing
- [ ] Can start conversation from bid
- [ ] Can start conversation from profile
- [ ] Messages send and receive
- [ ] Unread counts accurate
- [ ] Notifications trigger
- [ ] Context (job link) shows correctly

### Phase 3 Testing
- [ ] Can view forum categories
- [ ] Can create thread
- [ ] Can reply to thread
- [ ] Reactions work
- [ ] Following works
- [ ] Notifications trigger
- [ ] Mobile responsive

### Phase 4 Testing
- [ ] Points awarded for forum actions
- [ ] Badges unlock correctly
- [ ] Gamification page displays
- [ ] Badges show on profiles/posts
- [ ] Leaderboard accurate

### Phase 5 Testing
- [ ] Real-time updates work
- [ ] No duplicate notifications
- [ ] Search returns results
- [ ] Emails send correctly
- [ ] Performance acceptable

---

## PROGRESS LOG

### 23 January 2026
- Phase 0 (Notifications) completed
- Plan document created
- Starting Phase 1 (Dashboard Recent Activity)

---

*This document will be updated as we progress through each phase.*
