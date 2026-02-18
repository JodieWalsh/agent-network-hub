-- Forum Media Enhancements
-- Add display_order and caption columns to forum_post_media
-- Add index on post_id for fast lookups

ALTER TABLE forum_post_media
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caption TEXT;

CREATE INDEX IF NOT EXISTS idx_forum_post_media_post_id
  ON forum_post_media (post_id);
