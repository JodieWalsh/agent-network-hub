-- Add country and currency preferences to user profiles
-- These drive default currency for job postings and display preferences.
-- Existing columns inspection_jobs.budget_currency and inspection_payments.currency
-- already exist and default to 'AUD'.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'AU',
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'AUD';
