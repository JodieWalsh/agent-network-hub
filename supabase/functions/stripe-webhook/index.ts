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
              `id=eq.${jobId}&select=id,status,payment_status,requesting_agent_id,property_address,budget_currency`
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
          const notifUrl = `${supabase.url}/rest/v1/notifications`;

          // Check if inspector has completed payout onboarding
          const inspectorProfiles = await supabase.query(
            'profiles',
            `id=eq.${inspectorId}&select=stripe_connect_onboarding_complete,full_name`
          );
          const inspectorProfile = inspectorProfiles[0];
          const inspectorOnboarded = inspectorProfile?.stripe_connect_onboarding_complete === true;
          const inspectorName = inspectorProfile?.full_name || 'The inspector';

          console.log(`Inspector ${inspectorId} onboarded: ${inspectorOnboarded}`);

          // Steps 1-3 are always done: accept bid, decline others, create payment record
          const declineUrl = `${supabase.url}/rest/v1/inspection_bids?job_id=eq.${jobId}&id=neq.${bidId}&status=eq.pending`;
          const paymentInsertUrl = `${supabase.url}/rest/v1/inspection_payments`;

          // Determine job status based on inspector onboarding
          const jobStatus = inspectorOnboarded ? 'assigned' : 'pending_inspector_setup';

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

            // 3. Update job — 'assigned' or 'pending_inspector_setup'
            supabase.update('inspection_jobs', jobId, {
              status: jobStatus,
              payment_status: 'in_escrow',
              stripe_payment_intent_id: paymentIntentId,
              agreed_price: agreedPrice,
              agreed_date: escrowBid.proposed_date,
              assigned_inspector_id: inspectorId,
              accepted_bid_id: bidId,
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
                currency: escrowJob.budget_currency || 'AUD',
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

          // Send notifications based on inspector onboarding status
          if (inspectorOnboarded) {
            // === INSPECTOR IS ONBOARDED: Normal assignment flow ===
            console.log('Inspector onboarded — sending bid_accepted notification');

            // Notify inspector: bid accepted, start work
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
                  user_id: inspectorId,
                  type: 'bid_accepted',
                  title: 'Bid Accepted!',
                  message: `Your bid for ${escrowJob.property_address || 'an inspection'} has been accepted. You can now begin the inspection.`,
                  job_id: jobId,
                  bid_id: bidId,
                  from_user_id: posterId,
                }),
              });
              if (!res.ok) {
                console.error(`bid_accepted notification failed (${res.status}): ${await res.text()}`);
              } else {
                console.log(`bid_accepted notification sent to inspector ${inspectorId}`);
              }
            } catch (err) {
              console.error('bid_accepted notification error:', err);
            }

            // Notify poster: payment confirmed, inspector assigned
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
                  user_id: posterId,
                  type: 'payment_confirmed',
                  title: 'Payment Confirmed',
                  message: `Your payment of ${(escrowJob.budget_currency || 'AUD')} $${agreedPrice.toFixed(2)} for the inspection at ${escrowJob.property_address || 'a property'} has been confirmed. ${inspectorName} has been assigned.`,
                  job_id: jobId,
                  bid_id: bidId,
                }),
              });
              if (!res.ok) {
                console.error(`payment_confirmed notification failed (${res.status}): ${await res.text()}`);
              }
            } catch (err) {
              console.error('payment_confirmed notification error:', err);
            }
          } else {
            // === INSPECTOR NOT ONBOARDED: Pending setup flow ===
            console.log('Inspector NOT onboarded — sending payout_setup_required notification');

            // Notify inspector: complete payout setup
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
                  user_id: inspectorId,
                  type: 'payout_setup_required',
                  title: 'Congratulations! Complete setup to start your job',
                  message: `Your bid for ${escrowJob.property_address || 'an inspection'} was accepted! Set up your payout account to get officially assigned and start work.`,
                  job_id: jobId,
                  bid_id: bidId,
                  from_user_id: posterId,
                }),
              });
              if (!res.ok) {
                console.error(`payout_setup_required notification failed (${res.status}): ${await res.text()}`);
              } else {
                console.log(`payout_setup_required notification sent to inspector ${inspectorId}`);
              }
            } catch (err) {
              console.error('payout_setup_required notification error:', err);
            }

            // Notify poster: awaiting inspector setup
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
                  user_id: posterId,
                  type: 'awaiting_inspector_setup',
                  title: 'Bid accepted — awaiting inspector setup',
                  message: `You've accepted ${inspectorName}'s bid for ${escrowJob.property_address || 'a property'}. They're completing their payout setup and will be assigned shortly.`,
                  job_id: jobId,
                  bid_id: bidId,
                }),
              });
              if (!res.ok) {
                console.error(`awaiting_inspector_setup notification failed (${res.status}): ${await res.text()}`);
              }
            } catch (err) {
              console.error('awaiting_inspector_setup notification error:', err);
            }
          }

          // Notify declined inspectors (always)
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
                  console.error(`bid_declined notification failed for ${declined.inspector_id} (${res.status}): ${await res.text()}`);
                }
              } catch (err) {
                console.error(`bid_declined notification error for ${declined.inspector_id}:`, err);
              }
            });
            await Promise.all(declinedNotifPromises);
          } catch (notifErr) {
            console.error('Error sending bid_declined notifications:', notifErr);
          }

          console.log(`Escrow payment complete: job ${jobId} status=${jobStatus}, inspector=${inspectorId}`);
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
        let userId = account.metadata?.userId;

        console.log(`account.updated received: account=${account.id}, charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}, metadata_userId=${userId || 'MISSING'}`);

        // Fallback: if userId not in metadata, look up by stripe_connect_account_id
        if (!userId) {
          console.log(`No userId in account metadata for ${account.id}, looking up by stripe_connect_account_id...`);
          const matchedProfiles = await supabase.query(
            'profiles',
            `stripe_connect_account_id=eq.${account.id}&select=id`
          );
          if (matchedProfiles && matchedProfiles.length > 0) {
            userId = matchedProfiles[0].id;
            console.log(`Found user ${userId} by stripe_connect_account_id lookup`);
          } else {
            console.error(`account.updated: No profile found for Connect account ${account.id}. Cannot update onboarding status.`);
            break;
          }
        }

        // Check if onboarding is complete
        const onboardingComplete =
          account.charges_enabled && account.payouts_enabled;

        const updateOk = await supabase.update('profiles', userId, {
          stripe_connect_onboarding_complete: onboardingComplete,
        });

        console.log(`Connect account updated for user ${userId}: onboarding complete = ${onboardingComplete}, db update ok = ${updateOk}`);

          // If onboarding just became complete, complete any pending assignments + retry payouts
          if (onboardingComplete) {
            // -----------------------------------------------
            // COMPLETE PENDING ASSIGNMENTS (payout gating)
            // Jobs in 'pending_inspector_setup' where this inspector was accepted
            // -----------------------------------------------
            try {
              const pendingSetupJobs = await supabase.query(
                'inspection_jobs',
                `assigned_inspector_id=eq.${userId}&status=eq.pending_inspector_setup&select=id,property_address,requesting_agent_id,accepted_bid_id`
              );

              if (pendingSetupJobs && pendingSetupJobs.length > 0) {
                console.log(`Found ${pendingSetupJobs.length} pending_inspector_setup job(s) for inspector ${userId}`);
                const notifUrl = `${supabase.url}/rest/v1/notifications`;

                for (const setupJob of pendingSetupJobs) {
                  try {
                    // Transition job to 'assigned'
                    await supabase.update('inspection_jobs', setupJob.id, {
                      status: 'assigned',
                    });

                    console.log(`Job ${setupJob.id} transitioned from pending_inspector_setup to assigned`);

                    // Notify inspector: officially assigned
                    const inspNotifRes = await fetch(notifUrl, {
                      method: 'POST',
                      headers: {
                        apikey: supabase.key,
                        Authorization: `Bearer ${supabase.key}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                      },
                      body: JSON.stringify({
                        user_id: userId,
                        type: 'job_assigned',
                        title: 'You\'re officially assigned!',
                        message: `Your payout setup is complete. You can now start the inspection at ${setupJob.property_address || 'the property'}.`,
                        job_id: setupJob.id,
                        bid_id: setupJob.accepted_bid_id,
                        from_user_id: setupJob.requesting_agent_id,
                      }),
                    });
                    if (!inspNotifRes.ok) {
                      console.error(`job_assigned notification failed (${inspNotifRes.status}): ${await inspNotifRes.text()}`);
                    }

                    // Notify poster: inspector is now assigned
                    const posterNotifRes = await fetch(notifUrl, {
                      method: 'POST',
                      headers: {
                        apikey: supabase.key,
                        Authorization: `Bearer ${supabase.key}`,
                        'Content-Type': 'application/json',
                        Prefer: 'return=minimal',
                      },
                      body: JSON.stringify({
                        user_id: setupJob.requesting_agent_id,
                        type: 'inspector_assigned',
                        title: 'Inspector assigned to your job',
                        message: `The inspector has completed their payout setup and is now officially assigned to ${setupJob.property_address || 'your inspection'}.`,
                        job_id: setupJob.id,
                        bid_id: setupJob.accepted_bid_id,
                      }),
                    });
                    if (!posterNotifRes.ok) {
                      console.error(`inspector_assigned notification failed (${posterNotifRes.status}): ${await posterNotifRes.text()}`);
                    }
                  } catch (assignErr) {
                    console.error(`Failed to complete assignment for job ${setupJob.id}:`, assignErr);
                  }
                }
              }
            } catch (setupErr) {
              console.error('Error checking pending_inspector_setup jobs:', setupErr);
            }

            // -----------------------------------------------
            // RETRY PENDING PAYOUTS (existing logic)
            // -----------------------------------------------
            try {
              const pendingJobs = await supabase.query(
                'inspection_jobs',
                `assigned_inspector_id=eq.${userId}&payout_status=eq.pending&select=id,agreed_price,property_address,requesting_agent_id,budget_currency`
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
                      currency: (pendingJob.budget_currency || 'AUD').toLowerCase(),
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
            // Fetch job address and currency for notification message
            const jobs = await supabase.query(
              'inspection_jobs',
              `id=eq.${jobId}&select=property_address,budget_currency`
            );
            const jobAddress = jobs[0]?.property_address || 'an inspection';
            const jobCurrency = jobs[0]?.budget_currency || 'AUD';

            const amountFormatted = netAmount
              ? `${jobCurrency} $${(parseInt(netAmount) / 100).toFixed(2)}`
              : '';

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
