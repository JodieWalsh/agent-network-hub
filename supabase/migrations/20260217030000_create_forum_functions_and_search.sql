-- =============================================
-- Forum RPC Functions, Full-Text Search, Notifications
-- =============================================

-- =============================================
-- FULL-TEXT SEARCH
-- =============================================

-- Add tsvector column for full-text search
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate search vector
UPDATE forum_posts SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''));

-- GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_forum_posts_search ON forum_posts USING GIN(search_vector);

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION update_forum_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forum_posts_search_vector_trigger ON forum_posts;
CREATE TRIGGER forum_posts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_forum_post_search_vector();

-- =============================================
-- RPC: Toggle Forum Like
-- =============================================

CREATE OR REPLACE FUNCTION toggle_forum_like(
  p_user_id UUID,
  p_post_id UUID DEFAULT NULL,
  p_reply_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_liked BOOLEAN;
  v_author_id UUID;
BEGIN
  -- Validate: must target either post or reply
  IF p_post_id IS NULL AND p_reply_id IS NULL THEN
    RETURN json_build_object('error', 'Must specify post_id or reply_id');
  END IF;

  IF p_post_id IS NOT NULL THEN
    -- Check if already liked
    SELECT id INTO v_existing FROM forum_likes WHERE user_id = p_user_id AND post_id = p_post_id;

    IF v_existing IS NOT NULL THEN
      -- Unlike
      DELETE FROM forum_likes WHERE id = v_existing;
      UPDATE forum_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = p_post_id;
      -- Update author stats
      SELECT author_id INTO v_author_id FROM forum_posts WHERE id = p_post_id;
      UPDATE forum_user_stats SET likes_received = GREATEST(0, likes_received - 1) WHERE user_id = v_author_id;
      UPDATE forum_user_stats SET likes_given = GREATEST(0, likes_given - 1) WHERE user_id = p_user_id;
      v_liked := false;
    ELSE
      -- Like
      INSERT INTO forum_likes (user_id, post_id) VALUES (p_user_id, p_post_id);
      UPDATE forum_posts SET like_count = like_count + 1 WHERE id = p_post_id;
      -- Update author stats
      SELECT author_id INTO v_author_id FROM forum_posts WHERE id = p_post_id;
      INSERT INTO forum_user_stats (user_id, likes_received, reputation_points)
        VALUES (v_author_id, 1, 3)
        ON CONFLICT (user_id) DO UPDATE SET
          likes_received = forum_user_stats.likes_received + 1,
          reputation_points = forum_user_stats.reputation_points + 3;
      INSERT INTO forum_user_stats (user_id, likes_given)
        VALUES (p_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET likes_given = forum_user_stats.likes_given + 1;
      v_liked := true;
    END IF;
  ELSE
    -- Reply like
    SELECT id INTO v_existing FROM forum_likes WHERE user_id = p_user_id AND reply_id = p_reply_id;

    IF v_existing IS NOT NULL THEN
      DELETE FROM forum_likes WHERE id = v_existing;
      UPDATE forum_replies SET like_count = GREATEST(0, like_count - 1) WHERE id = p_reply_id;
      SELECT author_id INTO v_author_id FROM forum_replies WHERE id = p_reply_id;
      UPDATE forum_user_stats SET likes_received = GREATEST(0, likes_received - 1) WHERE user_id = v_author_id;
      UPDATE forum_user_stats SET likes_given = GREATEST(0, likes_given - 1) WHERE user_id = p_user_id;
      v_liked := false;
    ELSE
      INSERT INTO forum_likes (user_id, reply_id) VALUES (p_user_id, p_reply_id);
      UPDATE forum_replies SET like_count = like_count + 1 WHERE id = p_reply_id;
      SELECT author_id INTO v_author_id FROM forum_replies WHERE id = p_reply_id;
      INSERT INTO forum_user_stats (user_id, likes_received, reputation_points)
        VALUES (v_author_id, 1, 1)
        ON CONFLICT (user_id) DO UPDATE SET
          likes_received = forum_user_stats.likes_received + 1,
          reputation_points = forum_user_stats.reputation_points + 1;
      INSERT INTO forum_user_stats (user_id, likes_given)
        VALUES (p_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET likes_given = forum_user_stats.likes_given + 1;
      v_liked := true;
    END IF;
  END IF;

  RETURN json_build_object('liked', v_liked);
END;
$$;

-- =============================================
-- RPC: Toggle Forum Bookmark
-- =============================================

CREATE OR REPLACE FUNCTION toggle_forum_bookmark(
  p_user_id UUID,
  p_post_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_bookmarked BOOLEAN;
BEGIN
  SELECT id INTO v_existing FROM forum_bookmarks WHERE user_id = p_user_id AND post_id = p_post_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM forum_bookmarks WHERE id = v_existing;
    UPDATE forum_posts SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = p_post_id;
    v_bookmarked := false;
  ELSE
    INSERT INTO forum_bookmarks (user_id, post_id) VALUES (p_user_id, p_post_id);
    UPDATE forum_posts SET bookmark_count = bookmark_count + 1 WHERE id = p_post_id;
    v_bookmarked := true;
  END IF;

  RETURN json_build_object('bookmarked', v_bookmarked);
END;
$$;

-- =============================================
-- RPC: Toggle Forum Follow
-- =============================================

CREATE OR REPLACE FUNCTION toggle_forum_follow(
  p_user_id UUID,
  p_post_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing UUID;
  v_following BOOLEAN;
BEGIN
  SELECT id INTO v_existing FROM forum_follows WHERE user_id = p_user_id AND post_id = p_post_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM forum_follows WHERE id = v_existing;
    v_following := false;
  ELSE
    INSERT INTO forum_follows (user_id, post_id) VALUES (p_user_id, p_post_id);
    v_following := true;
  END IF;

  RETURN json_build_object('following', v_following);
END;
$$;

-- =============================================
-- RPC: Increment Post View Count
-- =============================================

CREATE OR REPLACE FUNCTION increment_post_view_count(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;

-- =============================================
-- RPC: Mark Reply as Solution
-- =============================================

CREATE OR REPLACE FUNCTION mark_reply_as_solution(
  p_post_id UUID,
  p_reply_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author UUID;
  v_reply_author UUID;
BEGIN
  -- Only post author can mark solution
  SELECT author_id INTO v_post_author FROM forum_posts WHERE id = p_post_id;
  IF v_post_author != p_user_id THEN
    RETURN json_build_object('error', 'Only the post author can mark a solution');
  END IF;

  -- Unmark any existing solution
  UPDATE forum_replies SET is_solution = false WHERE post_id = p_post_id AND is_solution = true;

  -- Mark new solution
  UPDATE forum_replies SET is_solution = true WHERE id = p_reply_id;
  UPDATE forum_posts SET is_solved = true, solved_reply_id = p_reply_id WHERE id = p_post_id;

  -- Award reputation to reply author
  SELECT author_id INTO v_reply_author FROM forum_replies WHERE id = p_reply_id;
  INSERT INTO forum_user_stats (user_id, solutions_count, reputation_points)
    VALUES (v_reply_author, 1, 10)
    ON CONFLICT (user_id) DO UPDATE SET
      solutions_count = forum_user_stats.solutions_count + 1,
      reputation_points = forum_user_stats.reputation_points + 10;

  RETURN json_build_object('success', true);
END;
$$;

-- =============================================
-- RPC: Search Forum Posts
-- =============================================

CREATE OR REPLACE FUNCTION search_forum_posts(
  p_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  post_type TEXT,
  author_id UUID,
  category_id UUID,
  regional_board_id UUID,
  view_count INT,
  like_count INT,
  reply_count INT,
  is_solved BOOLEAN,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id,
    fp.title,
    fp.content,
    fp.post_type,
    fp.author_id,
    fp.category_id,
    fp.regional_board_id,
    fp.view_count,
    fp.like_count,
    fp.reply_count,
    fp.is_solved,
    fp.is_pinned,
    fp.created_at,
    fp.last_activity_at,
    ts_rank(fp.search_vector, websearch_to_tsquery('english', p_query)) AS rank
  FROM forum_posts fp
  WHERE fp.status = 'published'
    AND fp.search_vector @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC, fp.last_activity_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================
-- NOTIFICATIONS: Add forum types
-- =============================================

-- Add forum_post_id column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS forum_post_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_forum_post ON notifications(forum_post_id) WHERE forum_post_id IS NOT NULL;

-- Update the CHECK constraint on notifications.type to include forum types
-- First drop the existing constraint, then re-add with forum types
DO $$
BEGIN
  -- Try to drop existing constraint (name may vary)
  BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Add new constraint with all types including forum
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'bid_received', 'bid_accepted', 'bid_declined', 'bid_edited',
      'job_assigned', 'report_submitted', 'report_approved',
      'payment_released', 'payment_confirmed', 'payment_refunded',
      'payout_setup_required', 'awaiting_inspector_setup', 'inspector_assigned',
      'review_received', 'badge_earned', 'job_expired', 'job_cancelled',
      'new_message', 'user_approved', 'user_rejected', 'user_promoted_admin',
      'job_posted_nearby',
      'forum_reply', 'forum_mention', 'forum_like', 'forum_solution',
      'forum_follow_reply', 'forum_badge_earned'
    )
  );
END;
$$;
