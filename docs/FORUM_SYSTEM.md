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
- **Pagination** — Posts use offset-based pagination but no "Load More" button on list pages
- **Edit/Delete posts** — RLS policies allow it but no UI exists
- **Trending algorithm** — Currently just sorts by `like_count` in the last week; no decay function
- **View count** — Increments on every page visit (no deduplication per user/session)

---

## Phase 2 — Engagement (Planned)

- AI-powered post suggestions and smart tagging
- Poll creation and voting UI (tables already exist)
- Case study post type with structured format
- Weekly digest emails
- Trending algorithm improvements (time-decay scoring)
- @mention support with autocomplete

### Phase 1 Changes Needed for Phase 2

| Phase 2 Feature | Phase 1 Prep Needed |
|-----------------|---------------------|
| Poll UI | Tables ready (`forum_polls`, `forum_poll_options`, `forum_poll_votes`). Need to add `has_poll` flag to post creation form and poll rendering in ForumPostView |
| @mentions | Need `forum_mention` notification trigger. Add user search/autocomplete to ReplyEditor and post content editor |
| Post media | `forum_post_media` table ready. Need file upload component (can reuse `uploadAttachment()` pattern from messaging) |
| Edit/Delete | RLS policies already permit. Need edit button in ForumPostView + inline editor, delete confirmation dialog |
| Pagination | Add "Load More" button to ForumCategoryView, ForumRegionalBoard, and ForumHome trending tab |
| Follower notifications | Move to database trigger or RPC (currently noted as TODO in ForumPostView) |

## Phase 3 — Moderation & Premium (Planned)

- Admin moderation dashboard (report queue, content actions)
- Premium-only categories/boards
- Pinned/featured posts (pin UI for admins — `is_pinned` column already exists)
- User reputation levels and badges
- Email notification digests
- Content quality scoring

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
| `supabase/migrations/20260217010000_create_forum_core_tables.sql` | Core tables |
| `supabase/migrations/20260217020000_create_forum_supporting_tables.sql` | Supporting tables + seed |
| `supabase/migrations/20260217030000_create_forum_functions_and_search.sql` | RPC + search + notifications |
| `supabase/migrations/20260218010000_add_forum_counter_rpcs.sql` | Counter increment RPCs (bug fix) |
