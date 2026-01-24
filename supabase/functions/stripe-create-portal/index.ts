/**
 * Stripe Create Customer Portal Session Edge Function
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Users can update payment methods, cancel, and view invoices.
 *
 * Request body:
 * - customerId: Stripe Customer ID
 *
 * Returns:
 * - url: The Customer Portal URL to redirect to
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  jsonResponse,
  errorResponse,
  handleCors,
} from '../_shared/stripe.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return errorResponse('Missing customerId');
    }

    // Determine return URL based on environment
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings/billing`,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
