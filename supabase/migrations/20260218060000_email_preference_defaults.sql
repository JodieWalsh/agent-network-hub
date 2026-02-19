-- Migration: Auto-create email preference rows for new users + backfill existing
-- This ensures every user has preference rows so the email system can check them.

-- 1. Trigger function: auto-create preference rows when a new profile is inserted
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification_preferences row (marketplace emails)
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create forum_email_preferences row (forum emails)
  INSERT INTO forum_email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_create_email_preferences ON profiles;
CREATE TRIGGER trg_create_email_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_email_preferences();

-- 3. Backfill existing users who don't have preference rows
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO forum_email_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM forum_email_preferences)
ON CONFLICT (user_id) DO NOTHING;
