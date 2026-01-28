-- Add payment_confirmed notification type
-- Sent to the poster after their escrow payment completes via Stripe Checkout

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'bid_received',
    'bid_accepted',
    'bid_declined',
    'bid_edited',
    'job_assigned',
    'report_submitted',
    'report_approved',
    'payment_released',
    'payment_refunded',
    'payment_confirmed',
    'review_received',
    'badge_earned',
    'job_expired',
    'job_cancelled',
    'new_message',
    'user_approved',
    'user_rejected',
    'user_promoted_admin'
  )
);
