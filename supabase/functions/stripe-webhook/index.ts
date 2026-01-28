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
          console.log('=== ESCROW HANDLER ENTERED ===');
          console.log('Session metadata:', JSON.stringify(session.metadata));
          const { jobId, bidId, userId: posterId, inspectorId } = session.metadata;
          const paymentIntentId = session.payment_intent;

          console.log(`Escrow checkout completed: job=${jobId}, bid=${bidId}, poster=${posterId}, inspector=${inspectorId}`);
          console.log('Payment intent ID:', paymentIntentId);

          // Re-validate job and bid in parallel
          const [escrowJobs, escrowBids] = await Promise.all([
            supabase.query(
              'inspection_jobs',
              `id=eq.${jobId}&select=id,status,payment_status,requesting_agent_id,property_address`
            ),
            supabase.query(
              'inspection_bids',
              `id=eq.${bidId}&select=id,status,proposed_price,proposed_date,inspector_id`
            ),
          ]);
          const escrowJob = escrowJobs[0];
          const escrowBid = escrowBids[0];

          if (!escrowJob || escrowJob.status !== 'open') {
            console.error(`Escrow webhook: Job ${jobId} is not open (status: ${escrowJob?.status}). Refund may be needed.`);
            break;
          }

          if (!escrowBid || escrowBid.status !== 'pending') {
            console.error(`Escrow webhook: Bid ${bidId} is not pending (status: ${escrowBid?.status}). Refund may be needed.`);
            break;
          }

          const agreedPrice = escrowBid.proposed_price;
          const amountInCents = Math.round(agreedPrice * 100);
          const { platformFee, inspectorPayout } = calculateFees(amountInCents);
          const now = new Date().toISOString();

          // Steps 1-4 are independent DB writes — run in parallel
          const declineUrl = `${supabase.url}/rest/v1/inspection_bids?job_id=eq.${jobId}&id=neq.${bidId}&status=eq.pending`;
          const paymentInsertUrl = `${supabase.url}/rest/v1/inspection_payments`;

          const [, , , paymentInsertRes] = await Promise.all([
            // 1. Accept the bid
            supabase.update('inspection_bids', bidId, { status: 'accepted' }),

            // 2. Decline all other pending bids for this job
            fetch(declineUrl, {
              method: 'PATCH',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ status: 'declined' }),
            }),

            // 3. Assign inspector to the job
            supabase.update('inspection_jobs', jobId, {
              status: 'assigned',
              payment_status: 'in_escrow',
              stripe_payment_intent_id: paymentIntentId,
              agreed_price: agreedPrice,
              agreed_date: escrowBid.proposed_date,
              assigned_inspector_id: inspectorId,
            }),

            // 4. Create inspection_payments record (amounts in cents)
            fetch(paymentInsertUrl, {
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
            }),
          ]);

          if (!paymentInsertRes.ok) {
            const errBody = await paymentInsertRes.text();
            console.error(`inspection_payments insert failed (${paymentInsertRes.status}): ${errBody}`);
          }

          // 5. Notify accepted inspector
          // NOTE: notifications table has job_id/bid_id/from_user_id FKs — NOT metadata/link columns.
          // Links are computed dynamically by getNotificationLink() in the frontend.
          const notifUrl = `${supabase.url}/rest/v1/notifications`;
          console.log('=== BID ACCEPTED NOTIFICATION DEBUG ===');
          console.log('Inspector ID (recipient):', inspectorId);
          console.log('Poster ID (from_user):', posterId);
          console.log('Job ID:', jobId);
          console.log('Bid ID:', bidId);
          console.log('Notification URL:', notifUrl);
          try {
            const notifBody = {
              user_id: inspectorId,
              type: 'bid_accepted',
              title: 'Bid Accepted!',
              message: `Your bid for ${escrowJob.property_address || 'an inspection'} has been accepted. You can now begin the inspection.`,
              job_id: jobId,
              bid_id: bidId,
              from_user_id: posterId,
            };
            console.log('Notification payload:', JSON.stringify(notifBody));
            const acceptedNotifRes = await fetch(notifUrl, {
              method: 'POST',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify(notifBody),
            });
            console.log('bid_accepted response status:', acceptedNotifRes.status);
            if (!acceptedNotifRes.ok) {
              const errBody = await acceptedNotifRes.text();
              console.error(`bid_accepted notification FAILED (${acceptedNotifRes.status}): ${errBody}`);
            } else {
              console.log(`bid_accepted notification SUCCESS — sent to inspector ${inspectorId}`);
            }
          } catch (notifErr) {
            console.error('bid_accepted notification EXCEPTION:', notifErr);
          }
          console.log('=== END BID ACCEPTED NOTIFICATION DEBUG ===');

          // 6. Notify declined inspectors
          try {
            const declinedBids = await supabase.query(
              'inspection_bids',
              `job_id=eq.${jobId}&status=eq.declined&select=inspector_id`
            );
            const declinedNotifPromises = (declinedBids || []).map(async (declined: any) => {
              try {
                const res = await fetch(notifUrl, {
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
                    job_id: jobId,
                    from_user_id: posterId,
                  }),
                });
                if (!res.ok) {
                  const errBody = await res.text();
                  console.error(`bid_declined notification failed for ${declined.inspector_id} (${res.status}): ${errBody}`);
                }
              } catch (err) {
                console.error(`bid_declined notification error for ${declined.inspector_id}:`, err);
              }
            });
            await Promise.all(declinedNotifPromises);
          } catch (notifErr) {
            console.error('Error sending bid_declined notifications:', notifErr);
          }

          // 7. Notify poster that payment was confirmed
          try {
            const posterNotifRes = await fetch(notifUrl, {
              method: 'POST',
              headers: {
                apikey: supabase.key,
                Authorization: `Bearer ${supabase.key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id: posterId,
                type: 'payment_confirmed',
                title: 'Payment Confirmed',
                message: `Your payment of $${agreedPrice.toFixed(2)} for the inspection at ${escrowJob.property_address || 'a property'} has been confirmed. The inspector has been assigned.`,
                job_id: jobId,
                bid_id: bidId,
              }),
            });
            if (!posterNotifRes.ok) {
              const errBody = await posterNotifRes.text();
              console.error(`payment_confirmed notification failed (${posterNotifRes.status}): ${errBody}`);
            } else {
              console.log(`payment_confirmed notification sent to poster ${posterId}`);
            }
          } catch (notifErr) {
            console.error('Error sending payment_confirmed notification:', notifErr);
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

          // If onboarding just became complete, retry any pending payouts
          if (onboardingComplete) {
            try {
              const pendingJobs = await supabase.query(
                'inspection_jobs',
                `assigned_inspector_id=eq.${userId}&payout_status=eq.pending&select=id,agreed_price,property_address,requesting_agent_id`
              );

              if (pendingJobs && pendingJobs.length > 0) {
                console.log(`Found ${pendingJobs.length} pending payout(s) for inspector ${userId}`);

                for (const pendingJob of pendingJobs) {
                  try {
                    const amountInCents = Math.round(pendingJob.agreed_price * 100);
                    const fees = calculateFees(amountInCents);

                    // Mark as processing
                    await supabase.update('inspection_jobs', pendingJob.id, {
                      payout_status: 'processing',
                    });

                    // Create transfer to inspector's Connect account
                    const transfer = await stripe.transfers.create({
                      amount: fees.inspectorPayout,
                      currency: 'aud',
                      destination: account.id,
                      transfer_group: `job_${pendingJob.id}`,
                      description: `Inspection payout for ${pendingJob.property_address || pendingJob.id}`,
                      metadata: {
                        jobId: pendingJob.id,
                        inspectorId: userId,
                        grossAmountCents: String(amountInCents),
                        platformFeeCents: String(fees.platformFee),
                        netAmountCents: String(fees.inspectorPayout),
                      },
                    });

                    const now = new Date().toISOString();

                    // Update job with payout details
                    await supabase.update('inspection_jobs', pendingJob.id, {
                      payout_status: 'paid',
                      payout_amount: fees.inspectorPayout,
                      payout_transfer_id: transfer.id,
                      payout_completed_at: now,
                    });

                    // Update inspection_payments record
                    const paymentUpdateUrl = `${supabase.url}/rest/v1/inspection_payments?job_id=eq.${pendingJob.id}`;
                    await fetch(paymentUpdateUrl, {
                      method: 'PATCH',
                      headers: {
                        apikey: supabase.key,
                        Authorization: `Bearer ${supabase.key}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                      },
                      body: JSON.stringify({
                        status: 'released',
                        stripe_transfer_id: transfer.id,
                        released_at: now,
                        net_amount: fees.inspectorPayout,
                      }),
                    });

                    console.log(`Pending payout completed: ${transfer.id} for job ${pendingJob.id}`);
                  } catch (payoutErr) {
                    console.error(`Failed to process pending payout for job ${pendingJob.id}:`, payoutErr);
                    // Mark as failed so it can be retried manually
                    await supabase.update('inspection_jobs', pendingJob.id, {
                      payout_status: 'failed',
                    });
                  }
                }
              }
            } catch (pendingErr) {
              console.error('Error checking pending payouts:', pendingErr);
            }
          }
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

            // Insert notification (use job_id FK, not metadata/link columns)
            const notifUrl = `${supabase.url}/rest/v1/notifications`;
            const paymentNotifRes = await fetch(notifUrl, {
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
                job_id: jobId,
              }),
            });

            if (!paymentNotifRes.ok) {
              const errBody = await paymentNotifRes.text();
              console.error(`payment_released notification failed (${paymentNotifRes.status}): ${errBody}`);
            } else {
              console.log(`Payment notification sent to inspector ${inspectorId}`);
            }
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
