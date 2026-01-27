-- =============================================
-- ADD USER STATUS NOTIFICATION TYPES
-- =============================================
-- Adds notification types for admin user approval, rejection, and promotion.
-- =============================================

-- 1. Drop the existing CHECK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Re-create with the 3 new types added
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'bid_received',
  'bid_accepted',
  'bid_declined',
  'bid_edited',
  'job_assigned',
  'report_submitted',
  'report_approved',
  'payment_released',
  'payment_refunded',
  'review_received',
  'badge_earned',
  'job_expired',
  'job_cancelled',
  'new_message',
  'user_approved',
  'user_rejected',
  'user_promoted_admin'
));
