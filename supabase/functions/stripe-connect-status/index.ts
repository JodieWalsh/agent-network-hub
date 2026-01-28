/**
 * Stripe Connect Status Check Edge Function
 *
 * Directly checks a Connect account's status via the Stripe API
 * and updates the database. This is a fallback for when the
 * account.updated webhook doesn't fire or is delayed.
 *
 * Request body:
 * - userId: The user's ID
 *
 * Returns:
 * - status: 'verified' | 'pending' | 'not_started'
 * - charges_enabled: boolean
 * - payouts_enabled: boolean
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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId } = await req.json();

    if (!userId) {
      return errorResponse('Missing userId');
    }

    const supabase = getSupabaseClient();

    // Look up profile
    const profiles = await supabase.query(
      'profiles',
      `id=eq.${userId}&select=stripe_connect_account_id,stripe_connect_onboarding_complete`
    );
    const profile = profiles[0];

    if (!profile) {
      return errorResponse('User not found', 404);
    }

    if (!profile.stripe_connect_account_id) {
      return jsonResponse({
        status: 'not_started',
        charges_enabled: false,
        payouts_enabled: false,
        onboarding_complete: false,
      });
    }

    // Directly check account status via Stripe API
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

    const chargesEnabled = !!account.charges_enabled;
    const payoutsEnabled = !!account.payouts_enabled;
    const onboardingComplete = chargesEnabled && payoutsEnabled;

    console.log(`Connect status check: account=${account.id}, user=${userId}, charges=${chargesEnabled}, payouts=${payoutsEnabled}, complete=${onboardingComplete}`);

    // Update database if status has changed
    if (onboardingComplete && !profile.stripe_connect_onboarding_complete) {
      console.log(`Updating onboarding_complete to true for user ${userId}`);
      await supabase.update('profiles', userId, {
        stripe_connect_onboarding_complete: true,
      });

      // Transition any pending_inspector_setup jobs to assigned
      // This is a safety net in case the account.updated webhook didn't fire
      try {
        const pendingJobs = await supabase.query(
          'inspection_jobs',
          `assigned_inspector_id=eq.${userId}&status=eq.pending_inspector_setup&select=id,property_address`
        );

        if (pendingJobs && pendingJobs.length > 0) {
          console.log(`Transitioning ${pendingJobs.length} pending_inspector_setup job(s) to assigned for user ${userId}`);
          for (const job of pendingJobs) {
            await supabase.update('inspection_jobs', job.id, {
              status: 'assigned',
            });
            console.log(`Job ${job.id} (${job.property_address}) transitioned to assigned`);
          }
        }
      } catch (jobErr) {
        console.error('Error transitioning pending jobs:', jobErr);
        // Non-blocking: profile is already updated, job transition is a bonus
      }
    }

    return jsonResponse({
      status: onboardingComplete ? 'verified' : 'pending',
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      onboarding_complete: onboardingComplete,
    });
  } catch (error) {
    console.error('Error checking connect status:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
