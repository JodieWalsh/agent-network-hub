-- =============================================
-- Forum Phase 2: Advanced Features Migration
-- Adds poll/case_study post types, case study columns,
-- edited_at tracking, badge-checking RPC, poll voting RPC,
-- forum-media storage bucket, and RLS policies
-- =============================================

-- 1. Expand post_type CHECK constraint to include 'poll' and 'case_study'
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_post_type_check;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_post_type_check
  CHECK (post_type IN ('discussion', 'question', 'poll', 'case_study'));

-- 2. Add case study columns to forum_posts
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS case_study_property_type TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS case_study_location TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS case_study_situation TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS case_study_findings TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS case_study_lessons TEXT;

-- 3. Add edited_at tracking columns
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 4. Enable RLS on poll tables and expert badges
ALTER TABLE forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_expert_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then create fresh
DO $$ BEGIN
  -- forum_polls policies
  DROP POLICY IF EXISTS "Authenticated users can create polls" ON forum_polls;
  DROP POLICY IF EXISTS "Anyone can read polls" ON forum_polls;
  -- forum_poll_options policies
  DROP POLICY IF EXISTS "Authenticated users can create poll options" ON forum_poll_options;
  DROP POLICY IF EXISTS "Anyone can read poll options" ON forum_poll_options;
  -- forum_poll_votes policies
  DROP POLICY IF EXISTS "Authenticated users can vote" ON forum_poll_votes;
  DROP POLICY IF EXISTS "Anyone can read votes" ON forum_poll_votes;
  -- forum_expert_badges policies
  DROP POLICY IF EXISTS "Anyone can read badges" ON forum_expert_badges;
END $$;

CREATE POLICY "Authenticated users can create polls"
  ON forum_polls FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read polls"
  ON forum_polls FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create poll options"
  ON forum_poll_options FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read poll options"
  ON forum_poll_options FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON forum_poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read votes"
  ON forum_poll_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can read badges"
  ON forum_expert_badges FOR SELECT TO authenticated
  USING (true);

-- 6. Vote on a forum poll RPC
CREATE OR REPLACE FUNCTION vote_forum_poll(
  p_poll_id UUID,
  p_option_ids UUID[],
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_allows_multiple BOOLEAN;
  v_ends_at TIMESTAMPTZ;
  v_option_id UUID;
BEGIN
  -- Check poll exists and isn't ended
  SELECT allows_multiple, ends_at INTO v_allows_multiple, v_ends_at
  FROM forum_polls WHERE id = p_poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF v_ends_at IS NOT NULL AND v_ends_at < now() THEN
    RAISE EXCEPTION 'Poll has ended';
  END IF;

  -- Validate single-choice polls
  IF NOT v_allows_multiple AND array_length(p_option_ids, 1) > 1 THEN
    RAISE EXCEPTION 'This poll only allows one vote';
  END IF;

  -- Remove existing votes for this user on this poll
  DELETE FROM forum_poll_votes WHERE poll_id = p_poll_id AND user_id = p_user_id;

  -- Recalculate existing option counts (reset)
  UPDATE forum_poll_options SET vote_count = (
    SELECT COUNT(*) FROM forum_poll_votes WHERE option_id = forum_poll_options.id
  ) WHERE poll_id = p_poll_id;

  -- Insert new votes
  FOREACH v_option_id IN ARRAY p_option_ids LOOP
    INSERT INTO forum_poll_votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, v_option_id, p_user_id);

    UPDATE forum_poll_options SET vote_count = vote_count + 1
    WHERE id = v_option_id;
  END LOOP;

  -- Update total votes on poll
  UPDATE forum_polls SET total_votes = (
    SELECT COUNT(DISTINCT user_id) FROM forum_poll_votes WHERE poll_id = p_poll_id
  ) WHERE id = p_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Check and award expert badges RPC
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID) RETURNS TEXT[] AS $$
DECLARE
  v_stats RECORD;
  v_awarded TEXT[] := '{}';
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM forum_user_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN v_awarded;
  END IF;

  -- Helpful Member: 10+ replies
  IF v_stats.total_replies >= 10 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'helpful_member', 'Helpful Member')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'helpful_member'); END IF;
  END IF;

  -- Problem Solver: 5+ solutions
  IF v_stats.solutions_given >= 5 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'problem_solver', 'Problem Solver')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'problem_solver'); END IF;
  END IF;

  -- Top Contributor: 50+ posts
  IF v_stats.total_posts >= 50 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'top_contributor', 'Top Contributor')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'top_contributor'); END IF;
  END IF;

  -- Rising Star: 100+ reputation
  IF v_stats.reputation_score >= 100 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'rising_star', 'Rising Star')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'rising_star'); END IF;
  END IF;

  -- Expert: 500+ reputation
  IF v_stats.reputation_score >= 500 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'expert', 'Expert')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'expert'); END IF;
  END IF;

  -- Community Leader: 1000+ reputation
  IF v_stats.reputation_score >= 1000 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'community_leader', 'Community Leader')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'community_leader'); END IF;
  END IF;

  RETURN v_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint on forum_expert_badges to prevent duplicate badge types per user
ALTER TABLE forum_expert_badges ADD CONSTRAINT forum_expert_badges_unique
  UNIQUE (user_id, badge_type);

-- 8. Create forum-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-media', 'forum-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to forum-media
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload forum media" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view forum media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own forum media" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can upload forum media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-media');

CREATE POLICY "Anyone can view forum media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'forum-media');

CREATE POLICY "Users can delete own forum media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-media' AND auth.uid()::text = (storage.foldername(name))[1]);
