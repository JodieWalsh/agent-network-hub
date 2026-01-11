-- Add currency column to properties table for multi-currency support
-- Auto-detect currency from property country (e.g., GB → GBP, US → USD, AU → AUD)

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'AUD';

-- Add comment explaining the column
COMMENT ON COLUMN public.properties.currency IS 'ISO 4217 currency code (e.g., GBP, USD, EUR, AUD) - auto-detected from property country';

-- Create index for filtering by currency
CREATE INDEX IF NOT EXISTS idx_properties_currency ON public.properties(currency);

-- Backfill existing properties with AUD (reasonable default for existing Australian properties)
UPDATE public.properties
SET currency = 'AUD'
WHERE currency IS NULL OR currency = '';

-- Add constraint to ensure currency is always 3 characters
ALTER TABLE public.properties
ADD CONSTRAINT chk_currency_format CHECK (LENGTH(currency) = 3);
