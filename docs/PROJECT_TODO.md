# 📝 BUYERS AGENT HUB - TO DO LIST

## Future Development Tasks

This document tracks features, improvements, and tasks to be done in future sessions.

---

## 🎨 DESIGN & UI/UX

### 1. Full Visual Revamp
**Priority:** Medium
**Status:** To Do

**What needs work:**
- [ ] My Inspection Work dashboard - colours not good
- [ ] Overall colour consistency across all pages
- [ ] Review all new inspection marketplace screens for visual polish
- [ ] Ensure Premium Network design system is applied consistently
- [ ] Mobile responsiveness review

**Design System Reminder:**
- Primary: Deep Forest Green (#064E3B)
- Accent: Rose Gold (#E8B4B8)
- Background: Champagne (#FEF9E7) for cards
- Success: Emerald (#059669)
- Warning: Deep Ruby (#BE123C)
- Bronze (#B45309) for premium/badge accents
- White/near-white page backgrounds (Notion/Linear minimal style)

**Tools to consider:**
- Figma (UI design)
- v0.dev (AI-generated React components)
- Relume (AI wireframes)
- Tailwind UI components

---

## 🔧 FEATURES TO BUILD

### 2. Inspection Report Form
**Priority:** High
**Status:** Next Up

Build the comprehensive form for inspectors to fill out after visiting a property.

### 3. Report View Page
**Priority:** High
**Status:** To Do

Display completed reports beautifully for the requesting agent.

### 4. Gamification Components
**Priority:** Medium
**Status:** To Do

- Badges display
- Points tracking
- Celebration animations
- Leaderboards

### 5. Review System
**Priority:** Medium
**Status:** To Do

Two-way reviews after job completion.

### 6. Subscription Billing System
**Priority:** High
**Status:** To Do

Stripe integration for user subscriptions:
- [ ] Subscription tiers (Free/Basic/Premium - awaiting Dani's decision)
- [ ] Monthly and annual billing options
- [ ] Stripe Checkout integration
- [ ] Customer portal for managing subscriptions
- [ ] Handle upgrades/downgrades
- [ ] Cancellation flow
- [ ] Webhook handling for payment events
- [ ] Grace period for failed payments

### 7. Marketplace Payment System (Inspection Fees)
**Priority:** High
**Status:** To Do

Stripe Connect for marketplace payments:
- [ ] Platform takes 10% of each inspection job fee
- [ ] Escrow: Hold payment until report is submitted and approved
- [ ] Release payment to inspector (90%) when requester approves
- [ ] Transfer platform fee (10%) to Buyers Agent Hub account
- [ ] Stripe Connect onboarding for inspectors (so they can receive payments)
- [ ] Handle refunds and disputes
- [ ] Payment history/earnings dashboard for inspectors
- [ ] Payout settings (bank account, payout schedule)

### 8. Email Notifications
**Priority:** Medium
**Status:** To Do

Actually send emails via Resend API (preferences are built, sending is not).

### 9. Push Notifications
**Priority:** Low
**Status:** Future

Mobile/browser push notifications.

### 10. Area-Based Job Notifications for Inspectors
**Priority:** Medium
**Status:** To Do

When a new inspection job is posted, notify building inspectors whose service area covers the job's location.

**Requirements:**
- [ ] When a job is posted, query `agent_service_areas` to find inspectors covering the job location
- [ ] Use PostGIS `ST_DWithin` or `ST_Contains` to match job coordinates against inspector service areas
- [ ] Send `job_posted_nearby` notification to each matched inspector
- [ ] Include property address and budget range in notification
- [ ] Link notification to the job detail page (`/inspections/spotlights/{jobId}`)
- [ ] Add `job_posted_nearby` to the notification type CHECK constraint
- [ ] Respect notification preferences (quiet hours, opt-out)
- [ ] Consider rate limiting: don't spam inspectors if many jobs posted at once

**Implementation notes:**
- Could be done as a Supabase database trigger (AFTER INSERT on `inspection_jobs` WHERE status = 'open')
- Or as part of the job posting Edge Function
- Inspectors must have `user_type = 'building_inspector'` and `is_approved = true`
- General area jobs (`property_address` starting with `"Area: "`) should match against the suburb/area rather than exact coordinates

---

## 🐛 BUGS TO FIX

*(Add bugs here as they're discovered)*

---

## 💡 IDEAS TO EXPLORE

- AI matching of properties to client briefs
- Voice notes in inspection reports
- Video walkthrough integration
- Mobile app (React Native)

---

## ✅ COMPLETED

- [x] Database tables for inspection marketplace
- [x] Job posting form with client brief integration
- [x] Property Spotlights board
- [x] Job detail page with Express Interest
- [x] Bidding system with edit & audit trail
- [x] My Posted Jobs dashboard (for job creators)
- [x] My Inspection Work dashboard (for inspectors)
- [x] Notification system (in-app + preferences)
- [x] Dani's Approval Checklist
- [x] Key Features documentation

---

*Last updated: 28 January 2026*
