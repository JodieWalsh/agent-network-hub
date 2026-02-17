-- =============================================
-- Forum Core Tables Migration
-- Creates 9 core tables for the community forum
-- =============================================

-- 1. Forum Categories
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'MessageSquare',
  color TEXT DEFAULT 'text-forest',
  display_order INT DEFAULT 0,
  post_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Forum Regional Boards
CREATE TABLE IF NOT EXISTS forum_regional_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  country_code TEXT DEFAULT 'AU',
  state_code TEXT,
  member_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Forum Posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
  regional_board_id UUID REFERENCES forum_regional_boards(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed', 'removed')),
  is_pinned BOOLEAN DEFAULT false,
  is_solved BOOLEAN DEFAULT false,
  solved_reply_id UUID, -- Will be set when a reply is marked as solution
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  bookmark_count INT DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Forum Replies
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Forum Post Media
CREATE TABLE IF NOT EXISTS forum_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Forum Likes
CREATE TABLE IF NOT EXISTS forum_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_likes_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  CONSTRAINT forum_likes_unique_post UNIQUE (user_id, post_id),
  CONSTRAINT forum_likes_unique_reply UNIQUE (user_id, reply_id)
);

-- 7. Forum Bookmarks
CREATE TABLE IF NOT EXISTS forum_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_bookmarks_unique UNIQUE (user_id, post_id)
);

-- 8. Forum Follows
CREATE TABLE IF NOT EXISTS forum_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_follows_unique UNIQUE (user_id, post_id)
);

-- 9. Forum User Regional Memberships
CREATE TABLE IF NOT EXISTS forum_user_regional_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES forum_regional_boards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_memberships_unique UNIQUE (user_id, board_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_board ON forum_posts(regional_board_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status ON forum_posts(status);
CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_forum_posts_last_activity ON forum_posts(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON forum_posts(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_reply_id);

CREATE INDEX IF NOT EXISTS idx_forum_likes_user ON forum_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_post ON forum_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_reply ON forum_likes(reply_id);

CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_user ON forum_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_follows_user ON forum_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_follows_post ON forum_follows(post_id);

CREATE INDEX IF NOT EXISTS idx_forum_memberships_user ON forum_user_regional_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_memberships_board ON forum_user_regional_memberships(board_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_regional_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_regional_memberships ENABLE ROW LEVEL SECURITY;

-- Categories & Boards: everyone can read
CREATE POLICY "Anyone can read categories" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read boards" ON forum_regional_boards FOR SELECT USING (true);

-- Posts: anyone can read published, authors can CRUD their own
CREATE POLICY "Anyone can read published posts" ON forum_posts FOR SELECT USING (status = 'published' OR author_id = auth.uid());
CREATE POLICY "Auth users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own posts" ON forum_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" ON forum_posts FOR DELETE USING (auth.uid() = author_id);

-- Replies: anyone can read, auth users can CRUD their own
CREATE POLICY "Anyone can read replies" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Auth users can create replies" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);

-- Media: anyone can read, uploaders manage their own
CREATE POLICY "Anyone can read media" ON forum_post_media FOR SELECT USING (true);
CREATE POLICY "Uploaders can insert media" ON forum_post_media FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can delete media" ON forum_post_media FOR DELETE USING (auth.uid() = uploader_id);

-- Likes: anyone can read, users manage their own
CREATE POLICY "Anyone can read likes" ON forum_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON forum_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON forum_likes FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks: users can read/manage their own
CREATE POLICY "Users can read own bookmarks" ON forum_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON forum_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON forum_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Follows: users can read/manage their own
CREATE POLICY "Users can read own follows" ON forum_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON forum_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON forum_follows FOR DELETE USING (auth.uid() = user_id);

-- Regional memberships: anyone can read (for counts), users manage their own
CREATE POLICY "Anyone can read memberships" ON forum_user_regional_memberships FOR SELECT USING (true);
CREATE POLICY "Users can join boards" ON forum_user_regional_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave boards" ON forum_user_regional_memberships FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_forum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_categories_updated_at BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_forum_updated_at();

CREATE TRIGGER forum_regional_boards_updated_at BEFORE UPDATE ON forum_regional_boards
  FOR EACH ROW EXECUTE FUNCTION update_forum_updated_at();

CREATE TRIGGER forum_posts_updated_at BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_forum_updated_at();

CREATE TRIGGER forum_replies_updated_at BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_forum_updated_at();
