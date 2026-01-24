-- Add payment_status column to inspection_jobs for escrow payment tracking
-- Status values:
--   'pending' - Payment not yet made (for draft jobs or legacy data)
--   'paid' - Payment secured in escrow
--   'released' - Payment released to inspector (job completed & approved)
--   'refunded' - Payment refunded (job cancelled before bid accepted or expired)

-- Add payment_status column
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add constraint to ensure valid payment status values
ALTER TABLE public.inspection_jobs
ADD CONSTRAINT valid_payment_status
CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'released', 'refunded'));

-- Update existing completed jobs to have 'released' status
UPDATE public.inspection_jobs
SET payment_status = 'released'
WHERE status = 'completed' AND payment_status = 'pending';

-- Update existing cancelled/expired jobs to have 'refunded' status
UPDATE public.inspection_jobs
SET payment_status = 'refunded'
WHERE status IN ('cancelled', 'expired') AND payment_status = 'pending';

-- Add index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_payment_status
ON public.inspection_jobs(payment_status);

-- Add comment documenting the column
COMMENT ON COLUMN public.inspection_jobs.payment_status IS 'Escrow payment status: pending (not paid), paid (in escrow), released (to inspector), refunded (back to poster)';
