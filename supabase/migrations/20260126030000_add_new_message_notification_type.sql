-- =============================================
-- ADD NEW_MESSAGE NOTIFICATION TYPE
-- =============================================
-- Phase 3: Messaging integration with notification system
-- =============================================

-- 1. Add conversation_id column for message notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- 2. Drop the old CHECK constraint (PostgreSQL auto-names inline checks)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Add new CHECK constraint including new_message, report_approved, payment_refunded
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
  'new_message'
));
