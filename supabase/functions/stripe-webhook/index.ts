/**
 * Stripe Webhook Handler Edge Function
 *
 * Handles all Stripe webhook events for:
 * - Subscription lifecycle (created, updated, deleted)
 * - Payment events (succeeded, failed)
 * - Inspection escrow payments (checkout completion, refunds)
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
 * - charge.refunded (for escrow refunds)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  webhookSecret,
  corsHeaders,
  jsonResponse,
  errorResponse,
  getSupabaseClient,
  calculateFees,
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

        // -----------------------------------------------
        // INSPECTION ESCROW PAYMENT
        // -----------------------------------------------
        if (session.metadata?.type === 'inspection_escrow') {
          const { jobId, bidId, userId: posterId, inspectorId } = session.metadata;
          const paymentIntentId = session.payment_intent;

          console.log(`Escrow checkout completed: job=${jobId}, bid=${bidId}, poster=${posterId}, inspector=${inspectorId}`);

          // Re-validate job is still open
          const escrowJobs = await supabase.query(
            'inspection_jobs',
            `id=eq.${jobId}&select=id,status,payment_status,requesting_agent_id,property_address`
          );
          const escrowJob = escrowJobs[0];

          if (!escrowJob || escrowJob.status !== 'open') {
            console.error(`Escrow webhook: Job ${jobId} is not open (status: ${escrowJob?.status}). Refund may be needed.`);
            break;
          }

          // Re-validate bid is still pending
          const escrowBids = await supabase.query(
            'inspection_bids',
            `id=eq.${bidId}&select=id,status,proposed_price,proposed_date,inspector_id`
          );
          const escrowBid = escrowBids[0];

          if (!escrowBid || escrowBid.status !== 'pending') {
            console.error(`Escrow webhook: Bid ${bidId} is not pending (status: ${escrowBid?.status}). Refund may be needed.`);
            break;
          }

          const agreedPrice = escrowBid.proposed_price;
          const amountInCents = Math.round(agreedPrice * 100);
          const { platformFee, inspectorPayout } = calculateFees(amountInCents);
          const now = new Date().toISOString();

          // 1. Accept the bid
          await supabase.update('inspection_bids', bidId, { status: 'accepted' });

          // 2. Decline all other pending bids for this job
          const declineUrl = `${supabase.url}/rest/v1/inspection_bids?job_id=eq.${jobId}&id=neq.${bidId}&status=eq.pending`;
          await fetch(declineUrl, {
            method: 'PATCH',
            headers: {
              apikey: supabase.key,
              Authorization: `Bearer ${supabase.key}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ status: 'declined' }),
          });

          // 3. Assign inspector to the job
          await supabase.update('inspection_jobs', jobId, {
            status: 'assigned',
            payment_status: 'in_escrow',
            stripe_payment_intent_id: paymentIntentId,
            agreed_price: agreedPrice,
            agreed_date: escrowBid.proposed_date,
            assigned_inspector_id: inspectorId,
          });

          // 4. Create inspection_payments record (amounts in cents)
          const paymentInsertUrl = `${supabase.url}/rest/v1/inspection_payments`;
          await fetch(paymentInsertUrl, {
            method: 'POST',
            headers: {
              apikey: supabase.key,
              Authorization: `Bearer ${supabase.key}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              job_id: jobId,
              payer_id: posterId,
              payee_id: inspectorId,
              gross_amount: amountInCents,
              platform_fee: platformFee,
              net_amount: inspectorPayout,
              currency: 'AUD',
              status: 'held',
              stripe_payment_intent_id: paymentIntentId,
              paid_at: now,
            }),
          });

          // 5. Notify accepted inspector
          const notifUrl = `${supabase.url}/rest/v1/notifications`;
          try {
            await fetch(notifUrl, {
              method: 'POST',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id: inspectorId,
                type: 'bid_accepted',
                title: 'Bid Accepted!',
                message: `Your bid for ${escrowJob.property_address || 'an inspection'} has been accepted. You can now begin the inspection.`,
                link: `/inspections/my-work`,
                metadata: { jobId, bidId },
              }),
            });
          } catch (notifErr) {
            console.error('Error sending bid_accepted notification:', notifErr);
          }

          // 6. Notify declined inspectors
          try {
            const declinedBids = await supabase.query(
              'inspection_bids',
              `job_id=eq.${jobId}&status=eq.declined&select=inspector_id`
            );
            for (const declined of declinedBids) {
              await fetch(notifUrl, {
                method: 'POST',
                headers: {
                  apikey: supabase.key,
                  Authorization: `Bearer ${supabase.key}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  user_id: declined.inspector_id,
                  type: 'bid_declined',
                  title: 'Bid Not Selected',
                  message: `Another inspector was selected for the inspection at ${escrowJob.property_address || 'a property'}.`,
                  link: `/inspections/my-work`,
                  metadata: { jobId },
                }),
              });
            }
          } catch (notifErr) {
            console.error('Error sending bid_declined notifications:', notifErr);
          }

          console.log(`Escrow payment complete: job ${jobId} assigned to inspector ${inspectorId}`);
          break;
        }

        // -----------------------------------------------
        // SUBSCRIPTION CHECKOUT (existing logic)
        // -----------------------------------------------
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        console.log(`Checkout session completed: userId=${userId}, customerId=${customerId}, subscriptionId=${subscriptionId}`);

        if (userId && customerId) {
          // If this is a subscription checkout, get the subscription details
          if (subscriptionId && session.mode === 'subscription') {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
              const priceId = subscription.items.data[0]?.price?.id;

              console.log(`Retrieved subscription: status=${subscription.status}, priceId=${priceId}`);

              // Determine tier from price ID
              let tier = 'free';
              if (priceId === 'price_1StGZQCnDmgyQa6dz7mrD80L' || priceId === 'price_1StGkDCnDmgyQa6dJOcQ0SDP') {
                tier = 'basic';
              } else if (priceId === 'price_1StGaACnDmgyQa6dhp2qJsO0' || priceId === 'price_1StGkpCnDmgyQa6dI4aYmsVQ') {
                tier = 'premium';
              }

              console.log(`Updating profile ${userId}: tier=${tier}, status=${subscription.status}`);

              // Update profile with full subscription info
              await supabase.update('profiles', userId, {
                stripe_customer_id: customerId,
                subscription_status: subscription.status,
                subscription_tier: tier,
                subscription_current_period_end: new Date(
                  subscription.current_period_end * 1000
                ).toISOString(),
              });

              console.log(`Successfully updated profile for user ${userId} to ${tier} tier`);
            } catch (subError) {
              console.error('Error retrieving subscription:', subError);
              // Still save customer ID even if subscription fetch fails
              await supabase.update('profiles', userId, {
                stripe_customer_id: customerId,
              });
            }
          } else {
            // Non-subscription checkout, just save customer ID
            await supabase.update('profiles', userId, {
              stripe_customer_id: customerId,
            });
          }
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
          if (priceId === 'price_1StGkDCnDmgyQa6dJOcQ0SDP') tier = 'basic'; // Annual

          // Premium tier price IDs
          if (priceId === 'price_1StGaACnDmgyQa6dhp2qJsO0') tier = 'premium'; // Monthly
          if (priceId === 'price_1StGkpCnDmgyQa6dI4aYmsVQ') tier = 'premium'; // Annual

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
        const jobId = transfer.metadata?.jobId;
        const inspectorId = transfer.metadata?.inspectorId;
        const netAmount = transfer.metadata?.netAmountCents;

        console.log(`Transfer created: ${transfer.id} to ${transfer.destination} for job ${jobId}`);

        // Create notification for the inspector about payment received
        if (inspectorId && jobId) {
          try {
            const amountFormatted = netAmount
              ? `$${(parseInt(netAmount) / 100).toFixed(2)}`
              : '';

            // Fetch job address for notification message
            const jobs = await supabase.query(
              'inspection_jobs',
              `id=eq.${jobId}&select=property_address`
            );
            const jobAddress = jobs[0]?.property_address || 'an inspection';

            // Insert notification
            const notifUrl = `${supabase.url}/rest/v1/notifications`;
            await fetch(notifUrl, {
              method: 'POST',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id: inspectorId,
                type: 'payment_released',
                title: 'Payment Received',
                message: `You've been paid ${amountFormatted} for your inspection at ${jobAddress}.`,
                link: '/settings/billing',
                metadata: { jobId, transferId: transfer.id, amount: netAmount },
              }),
            });

            console.log(`Payment notification sent to inspector ${inspectorId}`);
          } catch (notifError) {
            console.error('Error sending payment notification:', notifError);
          }
        }
        break;
      }

      // ===========================================
      // REFUND EVENTS
      // ===========================================
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;

        // Check if this is an inspection escrow refund
        if (paymentIntentId) {
          const refundJobs = await supabase.query(
            'inspection_jobs',
            `stripe_payment_intent_id=eq.${paymentIntentId}&select=id,payment_status`
          );
          const refundJob = refundJobs[0];

          if (refundJob) {
            console.log(`Escrow refund processed for job ${refundJob.id}`);

            // Update job payment status
            await supabase.update('inspection_jobs', refundJob.id, {
              payment_status: 'refunded',
            });

            // Update inspection_payments status
            const paymentUpdateUrl = `${supabase.url}/rest/v1/inspection_payments?job_id=eq.${refundJob.id}`;
            await fetch(paymentUpdateUrl, {
              method: 'PATCH',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ status: 'refunded' }),
            });
          }
        }
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
