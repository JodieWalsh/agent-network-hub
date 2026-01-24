-- Add expiry_date and must_have_features columns to client_briefs

ALTER TABLE public.client_briefs
ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE public.client_briefs
ADD COLUMN IF NOT EXISTS must_have_features TEXT[];

-- Add index for expiry queries
CREATE INDEX IF NOT EXISTS idx_client_briefs_expiry ON public.client_briefs(expiry_date);
