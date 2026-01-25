/**
 * Stripe Create Checkout Session Edge Function
 *
 * Creates a Stripe Checkout session for subscription payments.
 *
 * Request body:
 * - priceId: Stripe Price ID for the subscription tier
 * - userId: User's ID for associating the subscription
 *
 * Returns:
 * - sessionId: The Checkout Session ID for redirecting
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  corsHeaders,
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
    const { priceId, userId } = await req.json();

    if (!priceId || !userId) {
      return errorResponse('Missing priceId or userId');
    }

    const supabase = getSupabaseClient();

    // Get or create Stripe customer
    const profiles = await supabase.query('profiles', `id=eq.${userId}&select=stripe_customer_id,email,full_name`);
    const profile = profiles[0];

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase.update('profiles', userId, {
        stripe_customer_id: customerId,
      });
    }

    // Determine URLs based on environment
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax/invoicing
      billing_address_collection: 'required',
      // Show tax ID collection for business customers
      tax_id_collection: { enabled: true },
      // Required for tax_id_collection with existing customers
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
    });

    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
