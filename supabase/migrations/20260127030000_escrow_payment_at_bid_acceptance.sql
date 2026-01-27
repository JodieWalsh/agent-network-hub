-- =============================================
-- ESCROW PAYMENT AT BID ACCEPTANCE
-- =============================================
-- Changes payment flow: jobs are posted FREE, payment is collected
-- when the poster accepts an inspector's bid via Stripe Checkout.
-- Replaces 'paid' status with 'in_escrow' for clarity.
-- =============================================

-- 1. Drop the existing CHECK constraint
ALTER TABLE public.inspection_jobs DROP CONSTRAINT IF EXISTS valid_payment_status;

-- 2. Migrate any existing rows that have 'paid' to 'in_escrow'
--    (must happen BEFORE re-creating constraint, since new constraint rejects 'paid')
UPDATE public.inspection_jobs
SET payment_status = 'in_escrow'
WHERE payment_status = 'paid';

-- 3. Re-create constraint with 'in_escrow' replacing 'paid'
ALTER TABLE public.inspection_jobs
ADD CONSTRAINT valid_payment_status
CHECK (payment_status IS NULL OR payment_status IN ('pending', 'in_escrow', 'released', 'refunded'));

-- 4. Add stripe_payment_intent_id column for tracking the escrow charge
ALTER TABLE public.inspection_jobs
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.inspection_jobs.stripe_payment_intent_id
IS 'Stripe PaymentIntent ID for the escrow payment charged at bid acceptance';

-- 5. Add index for PaymentIntent lookups (partial - only non-null)
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_payment_intent
ON public.inspection_jobs(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;
