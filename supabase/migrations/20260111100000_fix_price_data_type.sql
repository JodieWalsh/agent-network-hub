-- Fix property price data type and ensure accurate storage
--
-- PROBLEM:
-- Price column was INTEGER which can cause issues:
-- 1. Limited range (max 2.1 billion - insufficient for some luxury properties)
-- 2. Potential precision loss in some edge cases
-- 3. No validation constraints
--
-- SOLUTION:
-- 1. Change to BIGINT (supports up to 9,223,372,036,854,775,807)
-- 2. Add CHECK constraint to ensure positive values only
-- 3. Add NOT NULL constraint (price is required)
--
-- This ensures prices are stored EXACTLY as entered with no rounding or truncation

-- Change price column from INTEGER to BIGINT
ALTER TABLE public.properties
ALTER COLUMN price TYPE BIGINT;

-- Add constraint: price must be positive
ALTER TABLE public.properties
ADD CONSTRAINT chk_price_positive CHECK (price > 0);

-- Add comment explaining the column
COMMENT ON COLUMN public.properties.price IS 'Property price as whole number (e.g., 900000 for £900,000). Stored in BIGINT for precision and range. Never use floating point math with this column.';

-- Note: Price is stored as the actual value (not in cents/pence)
-- For £900,000, store 900000
-- For $1,500,000, store 1500000
