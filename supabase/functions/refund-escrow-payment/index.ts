/**
 * Refund Escrow Payment Edge Function
 *
 * Refunds the escrow PaymentIntent for a cancelled inspection job.
 * Called when a poster cancels a job that has payment in escrow.
 *
 * Request body:
 * - jobId: The inspection job ID
 *
 * Returns:
 * - status: 'refunded'
 * - refundId: Stripe Refund ID
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
    const { jobId } = await req.json();

    if (!jobId) {
      return errorResponse('Missing jobId');
    }

    const supabase = getSupabaseClient();

    // Fetch the job
    const jobs = await supabase.query(
      'inspection_jobs',
      `id=eq.${jobId}&select=id,payment_status,stripe_payment_intent_id`
    );
    const job = jobs[0];

    if (!job) {
      return errorResponse('Job not found', 404);
    }

    if (!job.stripe_payment_intent_id) {
      return errorResponse('No payment to refund', 400);
    }

    if (job.payment_status !== 'in_escrow') {
      return errorResponse(`Cannot refund: payment status is ${job.payment_status}`, 400);
    }

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: job.stripe_payment_intent_id,
    });

    console.log(`Refund created: ${refund.id} for job ${jobId}, PaymentIntent ${job.stripe_payment_intent_id}`);

    // Update job payment status immediately (webhook will also update as safety net)
    await supabase.update('inspection_jobs', jobId, {
      payment_status: 'refunded',
    });

    // Update inspection_payments record
    const paymentUpdateUrl = `${supabase.url}/rest/v1/inspection_payments?job_id=eq.${jobId}`;
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

    return jsonResponse({
      status: 'refunded',
      refundId: refund.id,
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
