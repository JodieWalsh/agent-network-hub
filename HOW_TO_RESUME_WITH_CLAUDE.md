# How to Resume Development with Claude

This document explains how to start a new Claude session and have it understand the context of this project.

---

## Quick Start - Copy and Paste This Prompt

When starting a new Claude Code session, use this prompt:

```
I'm working on Agent Hub, a B2B SaaS platform for real estate professionals.

PROJECT CONTEXT:
- Platform: React + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Supabase (PostgreSQL with PostGIS, Storage, Auth)
- Location: Mapbox Geocoding API
- Current branch: main
- Dev server: http://localhost:8087

RECENT WORK (January 11, 2026):
We just fixed three critical bugs:
1. Added Admin Property Review Modal - admins can now view full property details before approving/rejecting
2. Fixed missing street numbers in addresses - Mapbox geocoder now combines house number + street name
3. Fixed price storage and validation - upgraded to BIGINT, added validation, prevented corruption

KEY PROJECT FILES:
- Plan file: C:\Users\Jodie Ralph\.claude\plans\drifting-whistling-matsumoto.md
- Session summary: SESSION_SUMMARY_2026-01-11.md
- Database migrations: supabase/migrations/*.sql
- Environment: .env (Supabase + Mapbox credentials configured)

IMPORTANT CONTEXT:
- Properties require admin approval before appearing in marketplace
- User roles: admin, verified_professional, pending_professional, guest
- File uploads go to Supabase Storage (property-images, floor-plans buckets)
- Currency auto-detects from property country (UK→GBP, US→USD, AU→AUD)
- Addresses use single smart search field (like Zillow/Airbnb)

Please read:
1. PROJECT_CONTEXT.md (if it exists)
2. SESSION_SUMMARY_2026-01-11.md
3. The plan file at C:\Users\Jodie Ralph\.claude\plans\drifting-whistling-matsumoto.md

Then let me know you're ready and I'll tell you what I need help with.
```

---

## Alternative: Minimal Prompt

If you just want to continue where we left off:

```
Continue working on Agent Hub. Read SESSION_SUMMARY_2026-01-11.md to see what we just completed, then let me know you're ready for the next task.
```

---

## Understanding the Codebase Structure

### Frontend (`src/`)
```
src/
├── components/
│   ├── admin/          # Admin-only components (AdminPropertyReviewModal, etc.)
│   ├── layout/         # Dashboard layout, sidebar, navigation
│   ├── location/       # Location search components
│   ├── marketplace/    # Property cards, detail modals, gallery
│   ├── property/       # Property forms (AddressSearch, ImageUpload, PriceInput)
│   └── ui/            # shadcn/ui components (button, input, dialog, etc.)
├── contexts/          # React contexts (AuthContext)
├── lib/               # Utilities (mapbox-geocoder, currency, storage, permissions)
├── pages/             # Main pages (Admin, Marketplace, AddProperty, Directory)
└── integrations/      # Supabase client config
```

### Backend (`supabase/`)
```
supabase/
├── migrations/        # Database schema migrations (run in chronological order)
└── seed-agents.mjs    # Sample data script
```

### Key Migrations (in order):
1. `20251218074938_...sql` - Initial schema (profiles, properties tables)
2. `20260108040000_...sql` - Role and approval system
3. `20260108043000_...sql` - Storage buckets for images/floor plans
4. `20260111000003_...sql` - PostGIS geography for location search
5. `20260111080000_...sql` - Currency column for multi-currency support
6. `20260111100000_...sql` - BIGINT price column with validation

---

## Common Tasks

### Starting the Dev Server
```bash
npm run dev
```
Server runs on http://localhost:8087

### Running Database Migrations
```bash
SUPABASE_ACCESS_TOKEN="sbp_2b6bd8f7775de52e75100b919f735dfd3009bde1" npx supabase db push
```

### Checking TypeScript Errors
```bash
npx tsc --noEmit
```

### Git Workflow
```bash
git status
git add .
git commit -m "Your commit message"
git push
```

---

## Key Environment Variables

From `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `SUPABASE_ACCESS_TOKEN` - For CLI migrations
- `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox geocoding API

---

## Important Patterns

### 1. Protected Routes
```typescript
<ProtectedRoute requiredPermission="CAN_SUBMIT_PROPERTY">
  <AddProperty />
</ProtectedRoute>
```

### 2. File Uploads
```typescript
import { uploadPropertyImage, uploadFloorPlan } from '@/lib/storage';

const result = await uploadPropertyImage(file, userId, propertyId, index);
// Returns: { url: string, path: string }
```

### 3. Permissions Check
```typescript
import { canSubmitProperty } from '@/lib/permissions';

const permissions = usePermissions();
const canAdd = canSubmitProperty(permissions);
```

### 4. Currency Detection
```typescript
import { getCurrencyForCountry } from '@/lib/currency';

const currency = getCurrencyForCountry('GB'); // Returns 'GBP'
```

---

## Admin User Credentials

**Email:** support@the-empowered-patient.org
**Role:** admin

Use this account to test admin features.

---

## Debugging Tips

### View Database Data
```bash
node seed-agents.mjs  # Run with: node <script-name>.mjs
```

### Check Supabase Storage
Go to: https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw/storage/buckets

### View Console Logs
- Price submission logs in browser console when submitting properties
- Mapbox geocoding responses logged in LocationSearch component

---

## Common Issues & Solutions

### Issue: "new row violates row-level security policy"
**Solution:** User doesn't have required role. Check:
1. User's role in profiles table
2. RLS policies allow the action
3. Admin users need `is_admin()` check in policies

### Issue: Images not uploading
**Solution:** Check storage RLS policies allow both verified_professional AND admin roles

### Issue: Price showing incorrectly
**Solution:** Check browser console logs during submission to see original vs parsed values

---

## Project Documentation Files

1. `SESSION_SUMMARY_2026-01-11.md` - What we did today
2. `PROJECT_CONTEXT.md` - Overall project architecture (if exists)
3. `HOW_TO_RESUME_WITH_CLAUDE.md` - This file
4. Plan file: `C:\Users\Jodie Ralph\.claude\plans\drifting-whistling-matsumoto.md`

---

## Contact & Repository

**Repository:** https://github.com/JodieWalsh/agent-network-hub
**Branch:** main
**Owner:** Jodie Ralph (jodie@agenthub.com)

---

Last Updated: January 11, 2026
