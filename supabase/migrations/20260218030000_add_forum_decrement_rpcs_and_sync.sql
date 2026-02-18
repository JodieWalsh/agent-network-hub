-- =============================================
-- Forum Decrement RPCs + Count Sync
-- Adds decrement functions for post/reply deletion
-- and syncs all denormalized counts with actual data.
-- =============================================

-- Decrement post count on a category (floor of 0)
CREATE OR REPLACE FUNCTION decrement_category_post_count(cat_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_categories
  SET post_count = GREATEST(0, post_count - 1)
  WHERE id = cat_id;
END;
$$;

-- Decrement post count on a regional board (floor of 0)
CREATE OR REPLACE FUNCTION decrement_board_post_count(p_board_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_regional_boards
  SET post_count = GREATEST(0, post_count - 1)
  WHERE id = p_board_id;
END;
$$;

-- Decrement reply count on a post (floor of 0)
CREATE OR REPLACE FUNCTION decrement_post_reply_count(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_posts
  SET reply_count = GREATEST(0, reply_count - 1)
  WHERE id = p_post_id;
END;
$$;

-- Decrement user forum stats (posts, replies, reputation) with floor of 0
CREATE OR REPLACE FUNCTION decrement_forum_user_stats(
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
  UPDATE forum_user_stats
  SET post_count = GREATEST(0, post_count - p_posts),
      reply_count = GREATEST(0, reply_count - p_replies),
      reputation_points = GREATEST(0, reputation_points - p_reputation),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- =============================================
-- One-time sync of all denormalized counts
-- =============================================

-- Fix category post counts
UPDATE forum_categories fc
SET post_count = (
  SELECT COUNT(*) FROM forum_posts fp
  WHERE fp.category_id = fc.id
  AND fp.status != 'removed'
);

-- Fix regional board post counts
UPDATE forum_regional_boards frb
SET post_count = (
  SELECT COUNT(*) FROM forum_posts fp
  WHERE fp.regional_board_id = frb.id
  AND fp.status != 'removed'
);

-- Fix post reply counts
UPDATE forum_posts fp
SET reply_count = (
  SELECT COUNT(*) FROM forum_replies fr
  WHERE fr.post_id = fp.id
);
