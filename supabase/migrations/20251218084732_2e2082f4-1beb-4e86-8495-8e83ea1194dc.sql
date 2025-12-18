-- Add is_verified to profiles (default false)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add currency_code to inspection_requests (default AUD for Australian market)
ALTER TABLE public.inspection_requests 
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'AUD';

-- Create index for currency filtering
CREATE INDEX IF NOT EXISTS idx_inspection_requests_currency ON public.inspection_requests(currency_code);