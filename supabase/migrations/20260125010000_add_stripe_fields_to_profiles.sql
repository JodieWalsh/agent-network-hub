-- Add Stripe-related fields to profiles table
-- These fields support:
-- 1. Subscriptions (monthly/annual plans)
-- 2. Stripe Connect (paying inspectors via marketplace)

-- ===========================================
-- SUBSCRIPTION FIELDS
-- ===========================================

-- Stripe Customer ID (for subscriptions and billing)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Subscription status from Stripe
-- Values: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';

-- Subscription tier
-- Values: free, basic, premium (enterprise handled separately)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- When the current subscription period ends (for showing days remaining)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

-- ===========================================
-- STRIPE CONNECT FIELDS (FOR INSPECTORS)
-- ===========================================

-- Stripe Connect Express account ID (for receiving payouts)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text UNIQUE;

-- Whether Connect onboarding is complete (can receive payouts)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean DEFAULT false;

-- ===========================================
-- INDEXES
-- ===========================================

-- Index for looking up users by Stripe customer ID (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Index for looking up users by Connect account ID (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id
ON public.profiles(stripe_connect_account_id)
WHERE stripe_connect_account_id IS NOT NULL;

-- Index for filtering by subscription status/tier (for analytics)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription
ON public.profiles(subscription_status, subscription_tier);

-- ===========================================
-- CONSTRAINTS
-- ===========================================

-- Ensure valid subscription status values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_subscription_status
CHECK (subscription_status IS NULL OR subscription_status IN (
  'free', 'active', 'trialing', 'past_due', 'canceled', 'unpaid',
  'incomplete', 'incomplete_expired'
));

-- Ensure valid subscription tier values
ALTER TABLE public.profiles
ADD CONSTRAINT valid_subscription_tier
CHECK (subscription_tier IS NULL OR subscription_tier IN ('free', 'basic', 'premium'));

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe Customer ID for subscriptions and billing';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Current subscription status from Stripe (free, active, trialing, past_due, canceled, etc.)';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Subscription tier: free, basic, or premium';
COMMENT ON COLUMN public.profiles.subscription_current_period_end IS 'When the current subscription period ends/renews';
COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'Stripe Connect Express account ID for receiving inspection payouts';
COMMENT ON COLUMN public.profiles.stripe_connect_onboarding_complete IS 'Whether the user has completed Stripe Connect onboarding and can receive payouts';
