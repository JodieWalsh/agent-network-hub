-- =============================================
-- Forum Supporting Tables + Seed Data
-- =============================================

-- 1. Forum Tags
CREATE TABLE IF NOT EXISTS forum_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Forum Post Tags (many-to-many)
CREATE TABLE IF NOT EXISTS forum_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
  CONSTRAINT forum_post_tags_unique UNIQUE (post_id, tag_id)
);

-- 3. Forum Expert Badges
CREATE TABLE IF NOT EXISTS forum_expert_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Forum Polls
CREATE TABLE IF NOT EXISTS forum_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  allows_multiple BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  total_votes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Forum Poll Options
CREATE TABLE IF NOT EXISTS forum_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count INT DEFAULT 0,
  display_order INT DEFAULT 0
);

-- 6. Forum Poll Votes
CREATE TABLE IF NOT EXISTS forum_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES forum_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_poll_votes_unique UNIQUE (poll_id, user_id, option_id)
);

-- 7. Forum Reports
CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'off_topic', 'inappropriate', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forum_reports_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- 8. Forum User Stats
CREATE TABLE IF NOT EXISTS forum_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  post_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  likes_given INT DEFAULT 0,
  likes_received INT DEFAULT 0,
  solutions_count INT DEFAULT 0,
  reputation_points INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_forum_tags_slug ON forum_tags(slug);
CREATE INDEX IF NOT EXISTS idx_forum_post_tags_post ON forum_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_tags_tag ON forum_post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_forum_expert_badges_user ON forum_expert_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_polls_post ON forum_polls(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_options_poll ON forum_poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_poll ON forum_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_user ON forum_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status);
CREATE INDEX IF NOT EXISTS idx_forum_user_stats_user ON forum_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_user_stats_reputation ON forum_user_stats(reputation_points DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_expert_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_stats ENABLE ROW LEVEL SECURITY;

-- Tags: anyone can read
CREATE POLICY "Anyone can read tags" ON forum_tags FOR SELECT USING (true);

-- Post Tags: anyone can read
CREATE POLICY "Anyone can read post tags" ON forum_post_tags FOR SELECT USING (true);
CREATE POLICY "Auth users can tag posts" ON forum_post_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can untag posts" ON forum_post_tags FOR DELETE USING (auth.uid() IS NOT NULL);

-- Expert Badges: anyone can read
CREATE POLICY "Anyone can read expert badges" ON forum_expert_badges FOR SELECT USING (true);

-- Polls: anyone can read
CREATE POLICY "Anyone can read polls" ON forum_polls FOR SELECT USING (true);
CREATE POLICY "Anyone can read poll options" ON forum_poll_options FOR SELECT USING (true);

-- Poll Votes: users manage their own
CREATE POLICY "Anyone can read vote counts" ON forum_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON forum_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports: users can create, only see their own
CREATE POLICY "Users can create reports" ON forum_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can see own reports" ON forum_reports FOR SELECT USING (auth.uid() = reporter_id);

-- User Stats: anyone can read
CREATE POLICY "Anyone can read user stats" ON forum_user_stats FOR SELECT USING (true);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

CREATE TRIGGER forum_user_stats_updated_at BEFORE UPDATE ON forum_user_stats
  FOR EACH ROW EXECUTE FUNCTION update_forum_updated_at();

-- =============================================
-- SEED DATA: Categories
-- =============================================

INSERT INTO forum_categories (name, slug, description, icon, color, display_order) VALUES
  ('Market Trends', 'market-trends', 'Discuss property market trends, forecasts, and analysis across different regions', 'TrendingUp', 'text-blue-600', 1),
  ('Legal & Compliance', 'legal-compliance', 'Share legal updates, compliance requirements, and regulatory changes affecting property professionals', 'Scale', 'text-purple-600', 2),
  ('Inspection Tips', 'inspection-tips', 'Best practices, checklists, and advice for building inspections', 'ClipboardCheck', 'text-amber-600', 3),
  ('Buyer Strategies', 'buyer-strategies', 'Negotiation tactics, due diligence tips, and buyer representation strategies', 'Target', 'text-green-600', 4),
  ('Technology & Tools', 'technology-tools', 'Software, apps, and tools that help property professionals work smarter', 'Laptop', 'text-indigo-600', 5),
  ('Networking & Events', 'networking-events', 'Industry events, meetups, and professional development opportunities', 'Calendar', 'text-pink-600', 6),
  ('Finance & Lending', 'finance-lending', 'Mortgage trends, lending criteria, and finance strategy discussions', 'Banknote', 'text-emerald-600', 7),
  ('Styling & Presentation', 'styling-presentation', 'Property styling tips, staging advice, and presentation best practices', 'Palette', 'text-rose-600', 8),
  ('Career & Business', 'career-business', 'Grow your practice, hiring, mentorship, and business development', 'Briefcase', 'text-orange-600', 9),
  ('General Discussion', 'general-discussion', 'Off-topic chat, introductions, and anything that doesn''t fit elsewhere', 'MessageCircle', 'text-gray-600', 10)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- SEED DATA: Regional Boards (Australian states + major cities)
-- =============================================

INSERT INTO forum_regional_boards (name, slug, description, country_code, state_code) VALUES
  ('Sydney', 'sydney', 'Property discussions for the Sydney metropolitan area', 'AU', 'NSW'),
  ('Melbourne', 'melbourne', 'Property discussions for the Melbourne metropolitan area', 'AU', 'VIC'),
  ('Brisbane', 'brisbane', 'Property discussions for the Brisbane and SEQ region', 'AU', 'QLD'),
  ('Perth', 'perth', 'Property discussions for the Perth metropolitan area', 'AU', 'WA'),
  ('Adelaide', 'adelaide', 'Property discussions for the Adelaide metropolitan area', 'AU', 'SA'),
  ('Hobart', 'hobart', 'Property discussions for Tasmania', 'AU', 'TAS'),
  ('Canberra', 'canberra', 'Property discussions for the ACT region', 'AU', 'ACT'),
  ('Darwin', 'darwin', 'Property discussions for the Northern Territory', 'AU', 'NT'),
  ('Gold Coast', 'gold-coast', 'Property discussions for the Gold Coast region', 'AU', 'QLD'),
  ('Newcastle', 'newcastle', 'Property discussions for the Hunter Valley and Newcastle region', 'AU', 'NSW')
ON CONFLICT (slug) DO NOTHING;
