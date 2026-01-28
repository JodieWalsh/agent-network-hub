-- Payout gating at job assignment (Option C)
-- Inspectors must complete Stripe Connect onboarding before being assigned.
-- Jobs enter 'pending_inspector_setup' status after escrow payment if inspector
-- hasn't completed payout setup yet.

-- 1. Add 'pending_inspector_setup' to job status CHECK constraint
-- The inline constraint is auto-named inspection_jobs_status_check
ALTER TABLE public.inspection_jobs DROP CONSTRAINT IF EXISTS inspection_jobs_status_check;

ALTER TABLE public.inspection_jobs ADD CONSTRAINT inspection_jobs_status_check CHECK (
  status IN (
    'open',
    'in_negotiation',
    'pending_inspector_setup',
    'assigned',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled',
    'expired'
  )
);

-- 2. Add accepted_bid_id to track which bid was accepted before full assignment
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS accepted_bid_id UUID REFERENCES public.inspection_bids(id) ON DELETE SET NULL;

-- 3. Add new notification types for the gating flow
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'bid_received',
    'bid_accepted',
    'bid_declined',
    'bid_edited',
    'job_assigned',
    'report_submitted',
    'report_approved',
    'payment_released',
    'payment_confirmed',
    'payment_refunded',
    'payout_setup_required',
    'awaiting_inspector_setup',
    'inspector_assigned',
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
