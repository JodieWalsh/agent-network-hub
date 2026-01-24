/**
 * Shared Stripe Utilities for Edge Functions
 *
 * This module provides the server-side Stripe SDK initialization
 * and shared utilities for all Stripe-related Edge Functions.
 *
 * SECURITY: This code runs on the server and uses the SECRET key.
 * Never import this file in frontend code.
 */

import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

// Initialize Stripe with the secret key from environment variables
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  // Use Deno's native fetch
  httpClient: Stripe.createFetchHttpClient(),
});

// Webhook secret for signature verification
export const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

/**
 * Standard CORS headers for Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Get Supabase client for database operations
 */
export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Note: Using fetch directly since we're in Deno
  return {
    url: supabaseUrl,
    key: supabaseServiceKey,
    async query(table: string, query: string) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      });
      return response.json();
    },
    async update(table: string, id: string, data: Record<string, unknown>) {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(data),
      });
      return response.ok;
    },
  };
}

/**
 * Platform fee percentage for marketplace payments
 * Platform keeps 10%, inspector receives 90%
 */
export const PLATFORM_FEE_PERCENT = 10;

/**
 * Calculate platform fee and inspector payout
 *
 * @param totalAmount - Total amount in cents
 * @returns Object with platformFee and inspectorPayout (both in cents)
 */
export function calculateFees(totalAmount: number): {
  platformFee: number;
  inspectorPayout: number;
} {
  const platformFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENT / 100));
  const inspectorPayout = totalAmount - platformFee;
  return { platformFee, inspectorPayout };
}
