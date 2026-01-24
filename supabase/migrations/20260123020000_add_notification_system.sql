-- Notification System Migration
-- Creates tables for in-app notifications and multi-channel notification preferences

-- ===========================================
-- NOTIFICATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'bid_received',
    'bid_accepted',
    'bid_declined',
    'bid_edited',
    'job_assigned',
    'report_submitted',
    'payment_released',
    'review_received',
    'badge_earned',
    'job_expired',
    'job_cancelled'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities (for linking)
  job_id UUID REFERENCES public.inspection_jobs(id) ON DELETE SET NULL,
  bid_id UUID REFERENCES public.inspection_bids(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Delivery tracking (for future multi-channel)
  delivered_in_app BOOLEAN DEFAULT true,
  delivered_email BOOLEAN DEFAULT false,
  delivered_push BOOLEAN DEFAULT false,

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast unread notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read)
  WHERE read = false;

-- Index for user's notification list
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- System/authenticated users can insert notifications
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- NOTIFICATION PREFERENCES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- ===================
  -- EMAIL NOTIFICATIONS (Active now)
  -- ===================
  email_enabled BOOLEAN DEFAULT true,
  email_bid_received BOOLEAN DEFAULT true,
  email_bid_accepted BOOLEAN DEFAULT true,
  email_bid_declined BOOLEAN DEFAULT true,
  email_report_submitted BOOLEAN DEFAULT true,
  email_payment_released BOOLEAN DEFAULT true,
  email_review_received BOOLEAN DEFAULT true,
  email_badge_earned BOOLEAN DEFAULT false,
  email_weekly_digest BOOLEAN DEFAULT true,

  -- ===================
  -- PUSH NOTIFICATIONS (Coming soon - mobile/browser)
  -- ===================
  push_enabled BOOLEAN DEFAULT false,
  push_bid_received BOOLEAN DEFAULT true,
  push_bid_accepted BOOLEAN DEFAULT true,
  push_bid_declined BOOLEAN DEFAULT false,
  push_report_submitted BOOLEAN DEFAULT true,
  push_payment_released BOOLEAN DEFAULT true,
  push_review_received BOOLEAN DEFAULT true,
  push_badge_earned BOOLEAN DEFAULT true,

  -- Push subscription data (for when we implement)
  push_subscription JSONB, -- Stores browser/device push subscription
  push_device_tokens JSONB DEFAULT '[]', -- For mobile apps: [{device_id, token, platform, created_at}]

  -- ===================
  -- SMS NOTIFICATIONS (Future)
  -- ===================
  sms_enabled BOOLEAN DEFAULT false,
  sms_phone_number TEXT,
  sms_bid_accepted BOOLEAN DEFAULT false,
  sms_payment_released BOOLEAN DEFAULT false,

  -- ===================
  -- QUIET HOURS (Applies to email & push, not in-app)
  -- ===================
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  timezone TEXT DEFAULT 'Australia/Sydney',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- COMMENTS
-- ===========================================
COMMENT ON TABLE public.notifications IS 'In-app notifications for users with multi-channel delivery tracking';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification channels (email, push, SMS)';

COMMENT ON COLUMN public.notifications.type IS 'Type of notification for icon/styling and preference matching';
COMMENT ON COLUMN public.notifications.delivered_email IS 'Whether email was sent for this notification';
COMMENT ON COLUMN public.notifications.delivered_push IS 'Whether push notification was sent (future feature)';

COMMENT ON COLUMN public.notification_preferences.push_subscription IS 'Web Push API subscription object for browser notifications';
COMMENT ON COLUMN public.notification_preferences.push_device_tokens IS 'Array of mobile device tokens for iOS/Android push';
COMMENT ON COLUMN public.notification_preferences.quiet_hours_enabled IS 'Pause email and push notifications during set hours';
