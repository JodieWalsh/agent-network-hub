-- Fix check_and_award_badges(): it read four column names that do not exist
-- on the live forum_user_stats table, so it hard-errored (42703) for any user
-- with a stats row — the error was swallowed by the frontend caller, and no
-- badge has ever been awarded. Column corrections (only change in this file):
--   total_replies    -> reply_count
--   solutions_given  -> solutions_count
--   total_posts      -> post_count
--   reputation_score -> reputation_points
-- Thresholds, badge_type/badge_label values, and the
-- INSERT ... ON CONFLICT DO NOTHING / IF FOUND structure are unchanged
-- (forum_expert_badges_unique UNIQUE (user_id, badge_type) backs the conflict).

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  IF v_stats.reply_count >= 10 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'helpful_member', 'Helpful Member')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'helpful_member'); END IF;
  END IF;

  -- Problem Solver: 5+ solutions
  IF v_stats.solutions_count >= 5 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'problem_solver', 'Problem Solver')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'problem_solver'); END IF;
  END IF;

  -- Top Contributor: 50+ posts
  IF v_stats.post_count >= 50 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'top_contributor', 'Top Contributor')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'top_contributor'); END IF;
  END IF;

  -- Rising Star: 100+ reputation
  IF v_stats.reputation_points >= 100 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'rising_star', 'Rising Star')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'rising_star'); END IF;
  END IF;

  -- Expert: 500+ reputation
  IF v_stats.reputation_points >= 500 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'expert', 'Expert')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'expert'); END IF;
  END IF;

  -- Community Leader: 1000+ reputation
  IF v_stats.reputation_points >= 1000 THEN
    INSERT INTO forum_expert_badges (user_id, badge_type, badge_label)
    VALUES (p_user_id, 'community_leader', 'Community Leader')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_awarded := array_append(v_awarded, 'community_leader'); END IF;
  END IF;

  RETURN v_awarded;
END;
$$;
