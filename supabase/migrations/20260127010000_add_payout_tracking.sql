-- =============================================
-- ADD PAYOUT TRACKING TO INSPECTION JOBS
-- =============================================
-- Tracks the Stripe Connect Transfer status for
-- paying inspectors their 90% share.

-- Add payout tracking columns
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT NULL;

ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS payout_amount INTEGER DEFAULT NULL;

ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS payout_transfer_id TEXT DEFAULT NULL;

ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Constraint for valid payout status values
ALTER TABLE public.inspection_jobs
ADD CONSTRAINT valid_payout_status
CHECK (payout_status IS NULL OR payout_status IN ('pending', 'processing', 'paid', 'failed'));

-- Update existing completed jobs that have released payment
UPDATE public.inspection_jobs
SET payout_status = 'paid'
WHERE status = 'completed'
  AND payment_status = 'released'
  AND payout_status IS NULL;

-- Index for payout status queries (inspector earnings, admin dashboard)
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_payout_status
ON public.inspection_jobs(payout_status);

COMMENT ON COLUMN public.inspection_jobs.payout_status IS 'Stripe Connect payout status: pending (inspector not onboarded), processing (transfer created), paid (transfer completed), failed (transfer failed)';
COMMENT ON COLUMN public.inspection_jobs.payout_amount IS 'Amount paid to inspector in cents (90% of agreed_price)';
COMMENT ON COLUMN public.inspection_jobs.payout_transfer_id IS 'Stripe Transfer ID for the payout';
COMMENT ON COLUMN public.inspection_jobs.payout_completed_at IS 'Timestamp when payout was completed';
