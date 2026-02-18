-- Forum Phase 3: Moderation, Premium, Email Preferences
-- Adds admin moderation columns, premium categories, email preferences, quality indicators

-- 1. Add is_locked, is_featured, is_endorsed to forum_posts
ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_endorsed BOOLEAN DEFAULT false;

-- 2. Add is_premium_only to forum_categories
ALTER TABLE forum_categories
  ADD COLUMN IF NOT EXISTS is_premium_only BOOLEAN DEFAULT false;

-- 3. Create forum_email_preferences table
CREATE TABLE IF NOT EXISTS forum_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('never', 'daily', 'weekly')),
  notify_replies BOOLEAN DEFAULT true,
  notify_mentions BOOLEAN DEFAULT true,
  notify_follows BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for forum_email_preferences
ALTER TABLE forum_email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email preferences"
  ON forum_email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON forum_email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON forum_email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Mark 2 categories as premium (Networking & Events, Career & Business)
UPDATE forum_categories SET is_premium_only = true WHERE slug IN ('networking-events', 'career-business');

-- 5. Index on forum_reports for admin queue
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports (status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_created ON forum_reports (created_at DESC);
