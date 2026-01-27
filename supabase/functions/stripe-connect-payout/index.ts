/**
 * Stripe Connect Payout Edge Function
 *
 * Creates a Stripe Transfer to pay an inspector their 90% share
 * when a job is completed and the report is approved.
 *
 * Request body:
 * - jobId: The inspection job ID
 *
 * Returns:
 * - status: 'paid' | 'pending_onboarding' | 'already_paid'
 * - transferId: Stripe Transfer ID (if paid)
 * - amount: Payout amount in cents (if paid)
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

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return errorResponse('Missing jobId');
    }

    const supabase = getSupabaseClient();

    // Fetch the job with inspector details
    const jobs = await supabase.query(
      'inspection_jobs',
      `id=eq.${jobId}&select=id,status,payment_status,payout_status,agreed_price,assigned_inspector_id,property_address`
    );
    const job = jobs[0];

    if (!job) {
      return errorResponse('Job not found', 404);
    }

    // Validate job state
    if (job.status !== 'completed') {
      return errorResponse('Job is not completed', 400);
    }

    if (job.payment_status !== 'released') {
      return errorResponse('Payment has not been released', 400);
    }

    // Already paid
    if (job.payout_status === 'paid') {
      return jsonResponse({ status: 'already_paid', transferId: job.payout_transfer_id });
    }

    if (!job.assigned_inspector_id) {
      return errorResponse('No inspector assigned to this job', 400);
    }

    if (!job.agreed_price || job.agreed_price <= 0) {
      return errorResponse('No agreed price for this job', 400);
    }

    // Fetch inspector profile for Connect account
    const inspectors = await supabase.query(
      'profiles',
      `id=eq.${job.assigned_inspector_id}&select=id,stripe_connect_account_id,stripe_connect_onboarding_complete,full_name`
    );
    const inspector = inspectors[0];

    if (!inspector) {
      return errorResponse('Inspector not found', 404);
    }

    // If inspector hasn't completed onboarding, mark as pending
    if (!inspector.stripe_connect_account_id || !inspector.stripe_connect_onboarding_complete) {
      await supabase.update('inspection_jobs', jobId, {
        payout_status: 'pending',
      });

      return jsonResponse({
        status: 'pending_onboarding',
        message: 'Inspector has not completed payout setup. Payment will be held until they do.',
      });
    }

    // Convert dollars to cents (DB stores dollars, Stripe uses cents)
    const amountInCents = Math.round(job.agreed_price * 100);
    const { platformFee, inspectorPayout } = calculateFees(amountInCents);

    // Mark as processing before creating the transfer
    await supabase.update('inspection_jobs', jobId, {
      payout_status: 'processing',
    });

    // Create Stripe Transfer to inspector's Connect account
    const transfer = await stripe.transfers.create({
      amount: inspectorPayout,
      currency: 'aud',
      destination: inspector.stripe_connect_account_id,
      transfer_group: `job_${jobId}`,
      description: `Inspection payout for ${job.property_address || jobId}`,
      metadata: {
        jobId,
        inspectorId: inspector.id,
        inspectorName: inspector.full_name || '',
        grossAmountCents: String(amountInCents),
        platformFeeCents: String(platformFee),
        netAmountCents: String(inspectorPayout),
      },
    });

    const now = new Date().toISOString();

    // Update job with payout details
    await supabase.update('inspection_jobs', jobId, {
      payout_status: 'paid',
      payout_amount: inspectorPayout,
      payout_transfer_id: transfer.id,
      payout_completed_at: now,
    });

    // Upsert inspection_payments record
    // Use the REST API to check if a payment record exists
    const existingPayments = await supabase.query(
      'inspection_payments',
      `job_id=eq.${jobId}&select=id`
    );

    if (existingPayments.length > 0) {
      // Update existing record
      const paymentUrl = `${supabase.url}/rest/v1/inspection_payments?job_id=eq.${jobId}`;
      await fetch(paymentUrl, {
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
          gross_amount: amountInCents,
          platform_fee: platformFee,
          net_amount: inspectorPayout,
        }),
      });
    } else {
      // Fetch job to get the payer (requesting agent)
      const jobDetails = await supabase.query(
        'inspection_jobs',
        `id=eq.${jobId}&select=requesting_agent_id`
      );
      const payerId = jobDetails[0]?.requesting_agent_id;

      // Create new payment record
      const insertUrl = `${supabase.url}/rest/v1/inspection_payments`;
      await fetch(insertUrl, {
        method: 'POST',
        headers: {
          apikey: supabase.key,
          Authorization: `Bearer ${supabase.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          job_id: jobId,
          payer_id: payerId,
          payee_id: inspector.id,
          gross_amount: amountInCents,
          platform_fee: platformFee,
          net_amount: inspectorPayout,
          currency: 'AUD',
          status: 'released',
          stripe_transfer_id: transfer.id,
          paid_at: now,
          released_at: now,
        }),
      });
    }

    console.log(`Payout created: ${transfer.id} - $${(inspectorPayout / 100).toFixed(2)} to ${inspector.full_name} for job ${jobId}`);

    return jsonResponse({
      status: 'paid',
      transferId: transfer.id,
      amount: inspectorPayout,
    });
  } catch (error) {
    console.error('Error creating payout:', error);

    // If we know the jobId, mark payout as failed
    try {
      const { jobId } = await req.clone().json();
      if (jobId) {
        const supabase = getSupabaseClient();
        await supabase.update('inspection_jobs', jobId, {
          payout_status: 'failed',
        });
      }
    } catch (_) {
      // Ignore cleanup errors
    }

    return errorResponse(error.message || 'Internal server error', 500);
  }
});
