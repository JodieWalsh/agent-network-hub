/**
 * Accept Bid with Payment Edge Function
 *
 * Creates a Stripe Checkout Session for escrow payment when a poster
 * accepts an inspector's bid. The bid is NOT accepted here — that happens
 * in the webhook after payment succeeds.
 *
 * Request body:
 * - jobId: The inspection job ID
 * - bidId: The bid to accept
 * - userId: The poster's user ID (must own the job)
 *
 * Returns:
 * - checkoutUrl: Stripe Checkout URL to redirect the user to
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  stripe,
  jsonResponse,
  errorResponse,
  handleCors,
  getSupabaseClient,
  calculateFees,
} from '../_shared/stripe.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const t0 = performance.now();

  try {
    const { jobId, bidId, userId } = await req.json();

    if (!jobId || !bidId || !userId) {
      return errorResponse('Missing jobId, bidId, or userId');
    }

    const supabase = getSupabaseClient();

    // 1. Fetch job, bid, and profile in parallel (all use IDs from the request)
    console.time('db-parallel');
    const [jobs, bids, profiles] = await Promise.all([
      supabase.query(
        'inspection_jobs',
        `id=eq.${jobId}&select=id,status,payment_status,requesting_agent_id,property_address`
      ),
      supabase.query(
        'inspection_bids',
        `id=eq.${bidId}&select=id,job_id,inspector_id,proposed_price,status`
      ),
      supabase.query(
        'profiles',
        `id=eq.${userId}&select=stripe_customer_id,email,full_name`
      ),
    ]);
    console.timeEnd('db-parallel');

    const job = jobs[0];
    const bid = bids[0];
    const profile = profiles[0];

    // 2. Validate all three
    if (!job) {
      return errorResponse('Job not found', 404);
    }
    if (job.requesting_agent_id !== userId) {
      return errorResponse('You do not own this job', 403);
    }
    if (job.status !== 'open') {
      return errorResponse('Job is not open for bid acceptance', 400);
    }
    if (job.payment_status && job.payment_status !== 'pending') {
      return errorResponse(`Payment already in status: ${job.payment_status}`, 400);
    }

    if (!bid) {
      return errorResponse('Bid not found', 404);
    }
    if (bid.job_id !== jobId) {
      return errorResponse('Bid does not belong to this job', 400);
    }
    if (bid.status !== 'pending') {
      return errorResponse(`Bid is not pending (status: ${bid.status})`, 400);
    }
    if (!bid.proposed_price || bid.proposed_price <= 0) {
      return errorResponse('Bid has no valid price', 400);
    }

    if (!profile) {
      return errorResponse('User profile not found', 404);
    }

    // 3. Get or create Stripe customer for the poster
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      console.time('stripe-customer-create');
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: { userId },
      });
      customerId = customer.id;
      console.timeEnd('stripe-customer-create');

      // Fire-and-forget: save customer ID to profile (not needed for checkout)
      supabase.update('profiles', userId, {
        stripe_customer_id: customerId,
      }).catch((err: unknown) => console.error('Failed to save customer ID:', err));
    }

    // 4. Convert dollars to cents (DB stores dollars, Stripe uses cents)
    const amountInCents = Math.round(bid.proposed_price * 100);
    const { platformFee, inspectorPayout } = calculateFees(amountInCents);

    // 5. Create Stripe Checkout Session
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const addressLabel = job.property_address || 'Inspection Job';

    console.time('stripe-checkout-create');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'aud',
            unit_amount: amountInCents,
            product_data: {
              name: `Building Inspection`,
              description: `Inspection at ${addressLabel}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_group: `job_${jobId}`,
        metadata: {
          type: 'inspection_escrow',
          jobId,
          bidId,
          userId,
          inspectorId: bid.inspector_id,
          amountDollars: String(bid.proposed_price),
          platformFeeCents: String(platformFee),
          inspectorPayoutCents: String(inspectorPayout),
        },
      },
      metadata: {
        type: 'inspection_escrow',
        jobId,
        bidId,
        userId,
        inspectorId: bid.inspector_id,
      },
      success_url: `${origin}/inspections/my-jobs?payment=success&job=${jobId}`,
      cancel_url: `${origin}/inspections/my-jobs?payment=cancelled&job=${jobId}`,
    });
    console.timeEnd('stripe-checkout-create');

    const totalMs = Math.round(performance.now() - t0);
    console.log(
      `Checkout session created: ${session.id} for job ${jobId}, bid ${bidId}, amount $${bid.proposed_price} [${totalMs}ms]`
    );

    return jsonResponse({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Error creating escrow checkout:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
