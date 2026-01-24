/**
 * Stripe Connect Express Dashboard Edge Function
 *
 * Creates a login link to the Stripe Express Dashboard for inspectors.
 * This allows them to view their payouts, update bank details, etc.
 *
 * Request body:
 * - connectAccountId: Stripe Connect account ID
 *
 * Returns:
 * - url: The Express Dashboard URL to redirect to
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
    const { connectAccountId } = await req.json();

    if (!connectAccountId) {
      return errorResponse('Missing connectAccountId');
    }

    // Create Express Dashboard login link
    const loginLink = await stripe.accounts.createLoginLink(connectAccountId);

    return jsonResponse({ url: loginLink.url });
  } catch (error) {
    console.error('Error creating Connect dashboard link:', error);

    // Handle specific error for accounts that haven't completed onboarding
    if (error.code === 'account_invalid') {
      return errorResponse(
        'Please complete your payout account setup first.',
        400
      );
    }

    return errorResponse(error.message || 'Internal server error', 500);
  }
});
