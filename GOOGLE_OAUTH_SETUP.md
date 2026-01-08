# Google OAuth Setup Guide for Agent Hub

## Overview
This guide will help you set up Google Sign-In (OAuth) for your Agent Hub application.

---

## PART 1: Google Cloud Console Setup

### Step 1: Create Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Click the project dropdown at the top (next to "Google Cloud")
3. Click **"New Project"**
4. Enter project name: **"Agent Hub"**
5. Click **"Create"**
6. Wait for project creation, then select it from the dropdown

### Step 2: Enable Google+ API

1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for **"Google+ API"**
3. Click on it and click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**

**Fill in the form:**
- **App name:** Agent Hub
- **User support email:** support@the-empowered-patient.org
- **App logo:** (Optional - skip for now)
- **Application home page:** http://localhost:8080 (for testing)
- **Authorized domains:** (Leave blank for now - add your production domain later)
- **Developer contact email:** support@the-empowered-patient.org

4. Click **"Save and Continue"**

**Scopes:**
5. Click **"Add or Remove Scopes"**
6. Select these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Click **"Update"** then **"Save and Continue"**

**Test Users:**
8. Click **"Add Users"**
9. Add: support@the-empowered-patient.org
10. Click **"Save and Continue"**
11. Review and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth client ID"**
3. Application type: **"Web application"**
4. Name: **"Agent Hub Web Client"**

**Authorized JavaScript origins:**
5. Click **"Add URI"**
6. Add: `https://yrjtdunljzxasyohjdnw.supabase.co`

**Authorized redirect URIs:**
7. Click **"Add URI"**
8. Add: `https://yrjtdunljzxasyohjdnw.supabase.co/auth/v1/callback`

9. Click **"Create"**

**IMPORTANT:** You'll see a popup with your credentials. Copy these and save them somewhere safe:
- **Client ID** (looks like: `xxxxx-xxxxx.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xxxxx`)

---

## PART 2: Supabase Dashboard Configuration

1. Go to **https://supabase.com/dashboard/project/yrjtdunljzxasyohjdnw**
2. In the left sidebar, click **"Authentication"**
3. Click the **"Providers"** tab
4. Find **"Google"** in the list
5. Toggle it **ON** (enable it)

**Enter your credentials:**
6. **Client ID:** Paste the Client ID from Google Cloud Console
7. **Client Secret:** Paste the Client Secret from Google Cloud Console
8. **Skip nonce check:** Leave unchecked
9. Click **"Save"**

---

## PART 3: Testing Google Sign-In

### What's Been Implemented:

1. **Auth Page Updates:**
   - Added "Sign in with Google" button below the regular sign-in form
   - Styled with official Google colors and logo
   - Clean divider separating OAuth from regular login

2. **Profile Management:**
   - Automatically creates profile for new Google users
   - Pulls name from Google account
   - Pulls profile photo from Google account
   - Stores photo in `avatar_url` field
   - Updates existing profiles if avatar is missing

3. **Avatar Display Locations:**
   - ✅ TopBar (top right corner)
   - ✅ Sidebar (bottom user section)
   - 🔄 Agent Directory (next step)
   - 🔄 Profile Edit page (next step)

### How to Test:

1. Open your app: http://localhost:8080
2. Click "Sign Out" if you're logged in
3. You should see the Google Sign-In button on the auth page
4. Click **"Sign in with Google"**
5. Select your Google account
6. Grant permissions
7. You'll be redirected back to the dashboard
8. Your Google profile photo should appear in:
   - Top right corner (TopBar)
   - Bottom left of sidebar

### Expected Behavior:

**For new users:**
- Creates a new profile automatically
- Sets role to `guest` (they can apply to become professional later)
- Sets user_type to `buyers_agent` (they can change this in profile settings)
- Pulls name and photo from Google

**For existing users:**
- Updates avatar_url if it's currently null
- Updates full_name if it's currently null
- Preserves existing role, user_type, and other settings

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Check that the redirect URI in Google Cloud Console exactly matches:
  `https://yrjtdunljzxasyohjdnw.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes or typos

### "access_denied" Error
- Make sure you added yourself as a test user in the OAuth consent screen
- Check that the Google+ API is enabled

### Profile not created
- Check browser console for errors
- Verify Supabase connection is working
- Check that profiles table has correct RLS policies

### No avatar showing
- Check that Google account has a profile photo
- Check browser console for 404 errors on image URLs
- Verify avatar_url field is being populated in profiles table

---

## Next Steps

After Google OAuth is working:

1. **Add avatars to Agent Directory cards**
2. **Add avatar upload/display to Profile Edit page**
3. **Update production redirect URIs** when you deploy
4. **Publish OAuth app** (remove "Testing" status in Google Cloud Console)

---

## Security Notes

- Client Secret is stored securely in Supabase dashboard (not in code)
- OAuth tokens are managed by Supabase Auth
- Avatar URLs from Google are public CDN links (no authentication required)
- New OAuth users default to `guest` role (cannot submit properties until verified)
