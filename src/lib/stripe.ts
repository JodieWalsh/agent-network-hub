/**
 * Stripe Client Configuration
 *
 * This module provides the frontend Stripe.js integration for Buyers Agent Hub.
 *
 * WHAT THIS FILE DOES:
 * - Initializes Stripe.js with the publishable key (safe for frontend)
 * - Provides utilities for creating checkout sessions
 * - Provides utilities for Stripe Connect onboarding
 *
 * WHAT THIS FILE DOES NOT DO:
 * - Handle secret key operations (those go in Supabase Edge Functions)
 * - Process webhooks (handled by Edge Functions)
 * - Store payment methods directly (Stripe handles this securely)
 *
 * SECURITY NOTE:
 * - Only the PUBLISHABLE key (pk_xxx) is used here - this is safe for frontend
 * - The SECRET key (sk_xxx) must ONLY be used in Supabase Edge Functions
 * - Never import 'stripe' package in frontend code - only '@stripe/stripe-js'
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// ===========================================
// STRIPE.JS INITIALIZATION
// ===========================================

/**
 * Stripe publishable key from environment variables.
 * This key is safe to expose in frontend code.
 */
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

/**
 * Cached Stripe instance to avoid re-initialization.
 * loadStripe is called only once and the promise is reused.
 */
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get the Stripe.js instance.
 * Uses lazy initialization to avoid loading Stripe until needed.
 *
 * @example
 * const stripe = await getStripe();
 * if (stripe) {
 *   const result = await stripe.redirectToCheckout({ sessionId });
 * }
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    if (!stripePublishableKey) {
      console.error('[Stripe] Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// ===========================================
// CHECKOUT SESSION HELPERS
// ===========================================

/**
 * Redirect to Stripe Checkout for a subscription.
 * The actual session is created via Supabase Edge Function.
 *
 * @param sessionId - The Stripe Checkout Session ID from the Edge Function
 */
export async function redirectToCheckout(sessionId: string): Promise<{ error?: string }> {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return { error: 'Stripe failed to load. Please check your internet connection.' };
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('[Stripe] Checkout redirect error:', error);
      return { error: error.message };
    }

    return {};
  } catch (err) {
    console.error('[Stripe] Checkout error:', err);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Redirect to Stripe Customer Portal for subscription management.
 * The portal URL is generated via Supabase Edge Function.
 *
 * @param portalUrl - The Stripe Customer Portal URL from the Edge Function
 */
export function redirectToCustomerPortal(portalUrl: string): void {
  window.location.href = portalUrl;
}

// ===========================================
// STRIPE CONNECT HELPERS (FOR INSPECTORS)
// ===========================================

/**
 * Redirect to Stripe Connect onboarding.
 * Used for inspectors to set up their payout account.
 *
 * @param onboardingUrl - The Stripe Connect onboarding URL from the Edge Function
 */
export function redirectToConnectOnboarding(onboardingUrl: string): void {
  window.location.href = onboardingUrl;
}

/**
 * Redirect to Stripe Express Dashboard.
 * Used for inspectors to view their payouts and earnings.
 *
 * @param dashboardUrl - The Stripe Express Dashboard URL from the Edge Function
 */
export function redirectToConnectDashboard(dashboardUrl: string): void {
  window.location.href = dashboardUrl;
}

// ===========================================
// API HELPERS (CALLS TO SUPABASE EDGE FUNCTIONS)
// ===========================================

/**
 * Get authentication headers for Supabase Edge Function calls.
 * Retrieves the access token from localStorage.
 */
function getAuthHeaders(): Record<string, string> {
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Get access token from stored session
  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${projectId}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {
    console.error('[Stripe] Failed to get auth token:', e);
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'apikey': supabaseKey,
  };
}

/**
 * Create a checkout session for a subscription.
 * Calls the Supabase Edge Function which uses the secret key.
 *
 * @param priceId - The Stripe Price ID for the subscription tier
 * @param userId - The user's ID for associating the subscription
 * @returns The checkout session ID and URL
 */
export async function createCheckoutSession(
  priceId: string,
  userId: string
): Promise<{ sessionId?: string; url?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-create-checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ priceId, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create checkout session' };
    }

    const { sessionId, url } = await response.json();
    return { sessionId, url };
  } catch (err) {
    console.error('[Stripe] Create checkout session error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Create a customer portal session for subscription management.
 * Calls the Supabase Edge Function which uses the secret key.
 *
 * @param customerId - The Stripe Customer ID
 * @returns The portal URL to redirect to
 */
export async function createPortalSession(
  customerId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-create-portal`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create portal session' };
    }

    const { url } = await response.json();
    return { url };
  } catch (err) {
    console.error('[Stripe] Create portal session error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Create a Stripe Connect account link for inspector onboarding.
 * Calls the Supabase Edge Function which uses the secret key.
 *
 * @param userId - The user's ID
 * @returns The onboarding URL to redirect to
 */
export async function createConnectOnboardingLink(
  userId: string,
  country?: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-onboarding`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, country }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create onboarding link' };
    }

    const { url } = await response.json();
    return { url };
  } catch (err) {
    console.error('[Stripe] Create connect onboarding error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Create a Stripe Express Dashboard link for an inspector.
 * Calls the Supabase Edge Function which uses the secret key.
 *
 * @param connectAccountId - The Stripe Connect account ID
 * @returns The dashboard URL to redirect to
 */
export async function createConnectDashboardLink(
  connectAccountId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-dashboard`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ connectAccountId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create dashboard link' };
    }

    const { url } = await response.json();
    return { url };
  } catch (err) {
    console.error('[Stripe] Create connect dashboard error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Trigger a payout to an inspector's Stripe Connect account.
 * Called when a job report is approved and payment should be released.
 *
 * @param jobId - The inspection job ID
 * @returns The payout status and transfer details
 */
export async function createConnectPayout(
  jobId: string
): Promise<{ status?: string; transferId?: string; amount?: number; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-payout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create payout' };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[Stripe] Create connect payout error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Check the status of an inspector's Stripe Connect account.
 * Directly queries the Stripe API and updates the database if verified.
 * Use this as a fallback when the account.updated webhook is delayed.
 *
 * @param userId - The user's ID
 * @returns The connect account status
 */
export async function checkConnectStatus(
  userId: string
): Promise<{ status?: string; onboarding_complete?: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect-status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to check connect status' };
    }

    return await response.json();
  } catch (err) {
    console.error('[Stripe] Check connect status error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

// ===========================================
// ESCROW PAYMENT HELPERS (FOR INSPECTION JOBS)
// ===========================================

/**
 * Accept a bid with escrow payment via Stripe Checkout.
 * Creates a Checkout Session and returns the URL to redirect the poster to.
 * The bid is NOT accepted until payment succeeds (handled by webhook).
 *
 * @param jobId - The inspection job ID
 * @param bidId - The bid to accept
 * @param userId - The poster's user ID
 * @returns The checkout URL to redirect to
 */
export async function acceptBidWithPayment(
  jobId: string,
  bidId: string,
  userId: string
): Promise<{ checkoutUrl?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/accept-bid-with-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobId, bidId, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create payment session' };
    }

    const { checkoutUrl } = await response.json();
    return { checkoutUrl };
  } catch (err) {
    console.error('[Stripe] Accept bid with payment error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

/**
 * Refund an escrow payment for a cancelled job.
 *
 * @param jobId - The inspection job ID
 * @returns The refund status
 */
export async function refundEscrowPayment(
  jobId: string
): Promise<{ status?: string; refundId?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/refund-escrow-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to process refund' };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[Stripe] Refund escrow payment error:', err);
    return { error: 'Failed to connect to payment service' };
  }
}

// ===========================================
// SUBSCRIPTION TIER CONFIGURATION
// ===========================================

/**
 * Subscription tier definitions.
 * Price IDs from Stripe Dashboard (Sandbox).
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
    features: [
      'Basic profile listing',
      'Browse properties',
      'Limited job postings',
    ],
  },
  basic: {
    name: 'Basic',
    priceMonthly: 29,
    priceAnnual: 290, // ~17% discount
    stripePriceIdMonthly: 'price_1StGZQCnDmgyQa6dz7mrD80L',
    stripePriceIdAnnual: 'price_1StGkDCnDmgyQa6dJOcQ0SDP',
    features: [
      'Everything in Free',
      'Unlimited job postings',
      'Priority support',
      'Client brief templates',
    ],
  },
  premium: {
    name: 'Premium',
    priceMonthly: 79,
    priceAnnual: 790, // ~17% discount
    stripePriceIdMonthly: 'price_1StGaACnDmgyQa6dhp2qJsO0',
    stripePriceIdAnnual: 'price_1StGkpCnDmgyQa6dI4aYmsVQ',
    features: [
      'Everything in Basic',
      'Featured profile listing',
      'Advanced analytics',
      'White-label reports',
      'API access',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Format a price for display.
 *
 * @param amount - The amount in dollars (not cents)
 * @param currency - The currency code (default: AUD)
 */
export function formatPrice(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Check if a subscription is active.
 *
 * @param status - The subscription status from the database
 */
export function isSubscriptionActive(status: string | null): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Get days remaining until subscription renewal/expiry.
 *
 * @param periodEnd - The subscription period end date
 */
export function getDaysUntilRenewal(periodEnd: string | null): number | null {
  if (!periodEnd) return null;

  const endDate = new Date(periodEnd);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}
