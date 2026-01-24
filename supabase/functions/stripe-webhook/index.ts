/**
 * Stripe Webhook Handler Edge Function
 *
 * Handles all Stripe webhook events for:
 * - Subscription lifecycle (created, updated, deleted)
 * - Payment events (succeeded, failed)
 * - Connect account events (payout status)
 *
 * IMPORTANT: This endpoint must be registered in Stripe Dashboard:
 * https://dashboard.stripe.com/webhooks
 *
 * Events to subscribe to:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - account.updated (for Connect)
 * - transfer.created (for Connect payouts)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  webhookSecret,
  corsHeaders,
  jsonResponse,
  errorResponse,
  getSupabaseClient,
} from '../_shared/stripe.ts';

serve(async (req) => {
  // Webhook doesn't need CORS preflight but we handle it anyway
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse('Missing stripe-signature header', 400);
    }

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return errorResponse(`Webhook signature verification failed: ${err.message}`, 400);
    }

    const supabase = getSupabaseClient();

    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      // ===========================================
      // CHECKOUT EVENTS
      // ===========================================
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId = session.customer;

        if (userId && customerId) {
          // Update profile with customer ID if not already set
          await supabase.update('profiles', userId, {
            stripe_customer_id: customerId,
          });
        }

        console.log(`Checkout completed for user ${userId}`);
        break;
      }

      // ===========================================
      // SUBSCRIPTION EVENTS
      // ===========================================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by customer ID
        const profiles = await supabase.query(
          'profiles',
          `stripe_customer_id=eq.${customerId}&select=id`
        );
        const profile = profiles[0];

        if (profile) {
          // Determine tier from price ID
          const priceId = subscription.items.data[0]?.price?.id;
          let tier = 'free';

          // Basic tier price IDs
          if (priceId === 'price_1StGZQCnDmgyQa6dz7mrD80L') tier = 'basic'; // Monthly
          // TODO: Add annual price ID when created

          // Premium tier price IDs
          if (priceId === 'price_1StGaACnDmgyQa6dhp2qJsO0') tier = 'premium'; // Monthly
          // TODO: Add annual price ID when created

          await supabase.update('profiles', profile.id, {
            subscription_status: subscription.status,
            subscription_tier: tier,
            subscription_current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          });

          console.log(`Subscription ${event.type} for user ${profile.id}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by customer ID
        const profiles = await supabase.query(
          'profiles',
          `stripe_customer_id=eq.${customerId}&select=id`
        );
        const profile = profiles[0];

        if (profile) {
          await supabase.update('profiles', profile.id, {
            subscription_status: 'cancelled',
            subscription_tier: 'free',
            subscription_current_period_end: null,
          });

          console.log(`Subscription cancelled for user ${profile.id}`);
        }
        break;
      }

      // ===========================================
      // INVOICE/PAYMENT EVENTS
      // ===========================================
      case 'invoice.paid': {
        const invoice = event.data.object;
        console.log(`Invoice paid: ${invoice.id} for customer ${invoice.customer}`);
        // Could send email notification here
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`Invoice payment failed: ${invoice.id} for customer ${invoice.customer}`);
        // Could send email notification about failed payment
        // Could update subscription_status to 'past_due'
        break;
      }

      // ===========================================
      // CONNECT EVENTS (FOR INSPECTOR PAYOUTS)
      // ===========================================
      case 'account.updated': {
        const account = event.data.object;
        const userId = account.metadata?.userId;

        if (userId) {
          // Check if onboarding is complete
          const onboardingComplete =
            account.charges_enabled && account.payouts_enabled;

          await supabase.update('profiles', userId, {
            stripe_connect_onboarding_complete: onboardingComplete,
          });

          console.log(`Connect account updated for user ${userId}: onboarding complete = ${onboardingComplete}`);
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        console.log(`Transfer created: ${transfer.id} to ${transfer.destination}`);
        // Could create a notification for the inspector about incoming payout
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
