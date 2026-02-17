-- =============================================
-- Forum Counter RPC Functions
-- Adds missing increment/decrement functions for post counts,
-- reply counts, board member counts, and user stats.
-- =============================================

-- Increment reply count on a post + update last_activity_at
CREATE OR REPLACE FUNCTION increment_post_reply_count(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts
  SET reply_count = reply_count + 1,
      last_activity_at = now()
  WHERE id = p_post_id;
END;
$$;

-- Increment post count on a category
CREATE OR REPLACE FUNCTION increment_category_post_count(cat_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_categories
  SET post_count = post_count + 1
  WHERE id = cat_id;
END;
$$;

-- Increment post count on a regional board
CREATE OR REPLACE FUNCTION increment_board_post_count(p_board_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_regional_boards
  SET post_count = post_count + 1
  WHERE id = p_board_id;
END;
$$;

-- Increment member count on a regional board
CREATE OR REPLACE FUNCTION increment_board_member_count(p_board_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_regional_boards
  SET member_count = member_count + 1
  WHERE id = p_board_id;
END;
$$;

-- Decrement member count on a regional board
CREATE OR REPLACE FUNCTION decrement_board_member_count(p_board_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_regional_boards
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = p_board_id;
END;
$$;

-- Increment user forum stats (post or reply + reputation)
CREATE OR REPLACE FUNCTION increment_forum_user_stats(
  p_user_id UUID,
  p_posts INT DEFAULT 0,
  p_replies INT DEFAULT 0,
  p_reputation INT DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO forum_user_stats (user_id, post_count, reply_count, reputation_points)
  VALUES (p_user_id, p_posts, p_replies, p_reputation)
  ON CONFLICT (user_id) DO UPDATE SET
    post_count = forum_user_stats.post_count + p_posts,
    reply_count = forum_user_stats.reply_count + p_replies,
    reputation_points = forum_user_stats.reputation_points + p_reputation,
    updated_at = now();
END;
$$;
