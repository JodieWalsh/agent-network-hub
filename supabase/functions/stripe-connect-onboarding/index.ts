/**
 * Stripe Connect Onboarding Edge Function
 *
 * Creates or retrieves a Stripe Connect Express account for inspectors
 * and generates an onboarding link.
 *
 * This allows inspectors to receive payouts for completed inspections.
 *
 * Request body:
 * - userId: User's ID
 *
 * Returns:
 * - url: The Connect onboarding URL to redirect to
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  jsonResponse,
  errorResponse,
  handleCors,
  getSupabaseClient,
} from '../_shared/stripe.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId } = await req.json();

    if (!userId) {
      return errorResponse('Missing userId');
    }

    const supabase = getSupabaseClient();

    // Get user profile
    const profiles = await supabase.query(
      'profiles',
      `id=eq.${userId}&select=stripe_connect_account_id,email,full_name`
    );
    const profile = profiles[0];

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    let accountId = profile.stripe_connect_account_id;

    // Create Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU', // Default to Australia, can be made configurable
        email: profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: profile.full_name,
          product_description: 'Property inspection services',
          mcc: '6513', // Real estate agents and managers
        },
        metadata: {
          userId,
        },
      });

      accountId = account.id;

      // Save account ID to profile
      await supabase.update('profiles', userId, {
        stripe_connect_account_id: accountId,
        stripe_connect_onboarding_complete: false,
      });
    }

    // Determine URLs based on environment
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings/payouts?refresh=true`,
      return_url: `${origin}/settings/payouts?success=true`,
      type: 'account_onboarding',
    });

    return jsonResponse({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
