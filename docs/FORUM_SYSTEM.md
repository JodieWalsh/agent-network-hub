# Community Forum System

## Overview

The Community Forum is a professional discussion platform integrated into Buyers Agent Hub. It enables property professionals to share knowledge, ask questions, discuss market trends, and build professional relationships across the platform.

## Phase 1 — Foundation (Current)

Phase 1 delivers the core forum experience:

### Features
- **Categories** — 10 topic-based discussion categories (Market Trends, Legal & Compliance, etc.)
- **Regional Boards** — Location-specific discussion boards (Sydney, Melbourne, Brisbane, etc.)
- **Post Types** — Discussion posts and Question posts (with "Mark as Solution" for Q&A)
- **Replies** — 2-level nested replies with threading
- **Engagement** — Like, bookmark, and follow posts
- **Search** — Full-text search across post titles and content
- **Notifications** — 6 forum-specific notification types integrated with existing system
- **Reputation** — Points system rewarding quality contributions
- **Tags** — Up to 5 tags per post for cross-cutting topics

### Database Tables (17 total)

**Core Tables (9):**
| Table | Purpose |
|-------|---------|
| `forum_categories` | Topic categories with icon, color, slug |
| `forum_regional_boards` | Location-specific boards with country/state |
| `forum_posts` | Posts with type (discussion/question), content, metadata |
| `forum_replies` | Replies with 2-level nesting via `parent_reply_id` |
| `forum_post_media` | Media attachments on posts |
| `forum_likes` | Likes on posts and replies |
| `forum_bookmarks` | User bookmarks on posts |
| `forum_follows` | Follow posts for reply notifications |
| `forum_user_regional_memberships` | User membership in regional boards |

**Supporting Tables (8):**
| Table | Purpose |
|-------|---------|
| `forum_tags` | Tag definitions with usage count |
| `forum_post_tags` | Many-to-many post-tag relationships |
| `forum_expert_badges` | Expert badges awarded to users |
| `forum_polls` | Polls attached to posts (Phase 2 activation) |
| `forum_poll_options` | Poll answer options |
| `forum_poll_votes` | User votes on poll options |
| `forum_reports` | Content reports for moderation |
| `forum_user_stats` | Per-user forum statistics and reputation |

### Pages
| Route | Page | Purpose |
|-------|------|---------|
| `/forums` | ForumHome | Landing page with categories, regional boards, trending |
| `/forums/category/:slug` | ForumCategoryView | Posts filtered by category |
| `/forums/region/:slug` | ForumRegionalBoard | Posts filtered by regional board |
| `/forums/post/:id` | ForumPostView | Post detail with replies |
| `/forums/new` | ForumNewPost | Create new post form |

### Notification Types
| Type | Trigger | Recipient |
|------|---------|-----------|
| `forum_reply` | Someone replies to your post | Post author |
| `forum_mention` | Someone mentions you (future) | Mentioned user |
| `forum_like` | Someone likes your post/reply | Content author |
| `forum_solution` | Your reply marked as solution | Reply author |
| `forum_follow_reply` | New reply on a followed post | All followers |
| `forum_badge_earned` | Expert badge awarded | Badge recipient |

### Reputation Points
| Action | Points |
|--------|--------|
| Create post | +5 |
| Reply | +2 |
| Like received (post) | +3 |
| Like received (reply) | +1 |
| Solution marked | +10 |

### Bugs Found & Fixed (18 Feb 2026 Code Review)

| Bug | Severity | Fix |
|-----|----------|-----|
| `createReply()` sent `reply_count: undefined` in PATCH body, nulling post reply counts | Critical | Removed broken PATCH, use `increment_post_reply_count` RPC |
| `increment_post_reply_count` RPC didn't exist — reply counts never updated | Critical | Created RPC in migration `20260218010000` |
| `increment_category_post_count` RPC didn't exist — category counts never updated | Critical | Created RPC in migration |
| `decrement_board_member_count` RPC didn't exist — member counts never decremented on leave | Medium | Created RPC in migration |
| Board member count not incremented on join | Medium | Added `increment_board_member_count` RPC call |
| Board post count not incremented when posting to a regional board | Medium | Added `increment_board_post_count` RPC call |
| User stats upsert used `resolution=merge-duplicates` which overwrites instead of incrementing | Critical | Replaced with `increment_forum_user_stats` RPC using proper ON CONFLICT DO UPDATE |
| `fetchProfiles()` queried `reputation_score` which doesn't exist on `profiles` table | Low | Removed field from query and PostAuthor interface |
| `SelectItem value=""` in ForumNewPost caused Radix Select issues | Low | Changed to sentinel value `"none"` |

### Known Limitations (Phase 1)

- **Follower notifications** are not yet server-side — `forum_follow_reply` notifications require fetching all followers client-side (skipped for Phase 1)
- **Post media uploads** — `forum_post_media` table exists but no upload UI yet
- **Trending algorithm** — Currently just sorts by `like_count` in the last week; no decay function
- **View count** — Increments on every page visit (no deduplication per user/session)

---

## Phase 2 — Engagement (Completed 18 Feb 2026)

### Features Added
- **Polls** — Poll post type with 2-6 options, multiple choice support, optional end date. PollDisplay component with voting, progress bars, and percentage results
- **Case Studies** — Structured post type with property type, location, Situation/Findings/Lessons sections in color-coded cards
- **Expert Badges** — 6 badge types (Helpful Member, Problem Solver, Top Contributor, Rising Star, Expert, Community Leader) auto-awarded based on user stats. Displayed with tooltips across all author views
- **Similar Post Suggestions** — Debounced search (300ms, 15+ chars) shows existing similar posts when composing a new post title
- **Leaderboard** — Full page at `/forums/leaderboard` with all-time/monthly tabs, ranked table with badges, top 3 highlighted
- **My Posts** — User's posts page at `/forums/my-posts` with type filters (Discussion, Question, Poll, Case Study) and sort options
- **My Bookmarks** — Bookmarked posts page at `/forums/my-bookmarks` with remove action
- **Edit & Delete** — Inline edit for posts (title + content) and replies. Soft-delete posts, hard-delete replies. Shows (edited) indicator
- **Load More Pagination** — Category, regional board, and trending pages start with 10 posts and load more on demand

### New Database Changes (Migration `20260218020000_forum_phase2.sql`)
- `forum_posts.post_type` expanded: `'poll'`, `'case_study'` added
- `forum_posts` new columns: `case_study_property_type`, `case_study_location`, `case_study_situation`, `case_study_findings`, `case_study_lessons`, `edited_at`
- `forum_replies.edited_at` column added
- `forum_expert_badges` unique constraint on `(user_id, badge_type)`
- RLS policies on `forum_polls`, `forum_poll_options`, `forum_poll_votes`, `forum_expert_badges`
- `vote_forum_poll()` RPC — handles voting with single/multiple choice
- `check_and_award_badges()` RPC — checks thresholds, returns newly awarded badges
- `forum-media` storage bucket created

### New Pages & Components
| File | Purpose |
|------|---------|
| `src/components/forum/PollDisplay.tsx` | Poll voting and results display |
| `src/components/forum/CaseStudyDisplay.tsx` | Structured case study sections |
| `src/components/forum/UserBadges.tsx` | Badge icons with tooltips |
| `src/pages/ForumLeaderboard.tsx` | Reputation leaderboard |
| `src/pages/ForumMyPosts.tsx` | User's own posts |
| `src/pages/ForumMyBookmarks.tsx` | Bookmarked posts |

### Badge Thresholds
| Badge | Requirement |
|-------|-------------|
| Helpful Member | 10+ replies |
| Problem Solver | 5+ solutions |
| Top Contributor | 50+ posts |
| Rising Star | 100+ reputation |
| Expert | 500+ reputation |
| Community Leader | 1000+ reputation |

## Phase 3 — Moderation & Premium (Completed 18 Feb 2026)

### Features Added
- **Admin Moderation Dashboard** — `/forums/admin` with reports queue (dismiss/action), content search with quick actions (pin/lock/feature/delete), most reported users list, forum stats dashboard
- **Pin, Lock, Feature, Endorse** — Admin action buttons on ForumPostView. Locked posts hide reply editor. Visual indicators (pin/lock/star/badge icons) on PostCard and post detail
- **Premium Categories** — Categories marked `is_premium_only` show crown icon, non-premium users see upgrade CTA, category dropdown in ForumNewPost disables premium categories for non-premium users
- **Email Preferences** — `/settings/notifications` page with digest frequency (never/daily/weekly), toggles for replies/mentions/follows. Stored in `forum_email_preferences` table
- **Weekly Digest Stub** — Edge function `send-forum-digest` prepares digest content (new replies, trending posts, user stats). Logs output, Resend integration commented/ready
- **Content Quality Indicators** — "Staff Endorsed" badge (admin-set), "Community Validated" badge (10+ likes + solved), visual badges on PostCard and ForumPostView
- **Featured / Best Of Page** — `/forums/featured` with tabs: Staff Picks, Community Favorites, Most Helpful, This Week's Best. Linked from ForumSidebar
- **Photo Uploads** — PhotoUploader component on ForumNewPost (up to 10 images, 5MB each), PhotoGallery with lightbox on ForumPostView, camera icon with count on PostCard

### New Database Changes (Migration `20260218050000_forum_phase3.sql`)
- `forum_posts`: added `is_locked`, `is_featured`, `is_endorsed` columns
- `forum_categories`: added `is_premium_only` column (2 categories marked premium)
- `forum_email_preferences` table with RLS
- Indexes on `forum_reports` for status and date

### New Pages & Components
| File | Purpose |
|------|---------|
| `src/pages/ForumAdmin.tsx` | Admin moderation dashboard |
| `src/pages/ForumFeatured.tsx` | Featured / Best Of page |
| `src/pages/settings/NotificationSettings.tsx` | Email notification preferences |
| `src/components/forum/PhotoUploader.tsx` | Photo upload with preview grid |
| `src/components/forum/PhotoGallery.tsx` | Photo gallery with lightbox |
| `supabase/functions/send-forum-digest/index.ts` | Digest email edge function stub |

### Not Yet Implemented (Future)
- @mention support with autocomplete
- Trending algorithm improvements (time-decay scoring)
- Resend email integration for digests
- Admin user warning system

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/forum.ts` | All types + API functions |
| `src/pages/ForumHome.tsx` | Forum landing page |
| `src/pages/ForumCategoryView.tsx` | Category filtered view |
| `src/pages/ForumRegionalBoard.tsx` | Regional board view |
| `src/pages/ForumPostView.tsx` | Post detail + replies |
| `src/pages/ForumNewPost.tsx` | Create new post form |
| `src/components/forum/PostCard.tsx` | Reusable post card |
| `src/components/forum/ReplyThread.tsx` | Reply with nested children |
| `src/components/forum/ReplyEditor.tsx` | Reply input component |
| `src/components/forum/ForumSidebar.tsx` | Sidebar with stats and contributors |
| `src/components/forum/PhotoUploader.tsx` | Photo upload with preview grid |
| `src/components/forum/PhotoGallery.tsx` | Photo gallery with built-in lightbox |
| `src/pages/ForumAdmin.tsx` | Admin moderation dashboard |
| `src/pages/ForumFeatured.tsx` | Featured / Best Of page |
| `src/pages/settings/NotificationSettings.tsx` | Email notification preferences |
| `supabase/migrations/20260217010000_create_forum_core_tables.sql` | Core tables |
| `supabase/migrations/20260217020000_create_forum_supporting_tables.sql` | Supporting tables + seed |
| `supabase/migrations/20260217030000_create_forum_functions_and_search.sql` | RPC + search + notifications |
| `supabase/migrations/20260218010000_add_forum_counter_rpcs.sql` | Counter increment RPCs (bug fix) |
