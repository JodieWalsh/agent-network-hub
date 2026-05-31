/**
 * Shared Email Utilities for Edge Functions
 *
 * Direct Resend API integration and helpers for email preference checking.
 * Uses fetch calls instead of npm packages for better Deno compatibility.
 */

const resendApiKey = Deno.env.get('RESEND_API_KEY');

/**
 * Send an email directly via Resend API
 */
export async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  fromEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resendApiKey) {
    return { success: false, error: 'Missing RESEND_API_KEY' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// TODO: Switch to 'Buyers Agent Hub <notifications@buyersagenthub.com>' after domain verification
export const FROM_EMAIL = 'Buyers Agent Hub <onboarding@resend.dev>';

export const APP_URL = Deno.env.get('APP_URL') || 'https://agent-network-hub-1ynd.vercel.app';

/**
 * Get a user's email address from Supabase
 * Tries auth admin API first, falls back to profiles table
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) return null;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: 'application/json',
  };

  // Try auth admin API first with the REST filter endpoint.
  try {
    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?select=email&id=eq.${userId}&limit=1`,
      { headers }
    );

    if (authResponse.ok) {
      const rows = await authResponse.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].email) {
        return rows[0].email;
      }
    }
  } catch {
    // Fall through to profiles table
  }

  // Fallback: query profiles table for email
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=email&id=eq.${userId}&limit=1`,
      { headers }
    );

    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].email) {
        return rows[0].email;
      }
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Preference-to-column mapping for notification_preferences table
 */
const MARKETPLACE_PREF_MAP: Record<string, string> = {
  bid_received: 'email_bid_received',
  bid_accepted: 'email_bid_accepted',
  bid_declined: 'email_bid_declined',
  report_submitted: 'email_report_submitted',
  report_approved: 'email_report_submitted',
  payment_confirmed: 'email_payment_released',
  payment_released: 'email_payment_released',
  review_received: 'email_review_received',
  badge_earned: 'email_badge_earned',
  forum_badge_earned: 'email_badge_earned',
  payout_setup_required: 'email_bid_accepted',
};

/**
 * Forum notification types that check forum_email_preferences
 */
const FORUM_PREF_MAP: Record<string, string> = {
  forum_reply: 'notify_replies',
  forum_solution: 'notify_replies',
  forum_follow_reply: 'notify_follows',
};

/**
 * Types that should never send email
 */
const SKIP_EMAIL_TYPES = new Set([
  'new_message',
  'forum_like',
  'bid_edited',
  'job_expired',
  'job_cancelled',
  'forum_mention', // not implemented yet
]);

/**
 * Check if a user has email enabled for a given notification type.
 * Returns the user's email if they should receive the email.
 */
export async function checkEmailPreferences(
  userId: string,
  type: string
): Promise<{ shouldSend: boolean; email: string | null; reason?: string }> {
  // Skip types that never get emails
  if (SKIP_EMAIL_TYPES.has(type)) {
    return { shouldSend: false, email: null, reason: 'type_skipped' };
  }

  const email = await getUserEmail(userId);
  if (!email) {
    return { shouldSend: false, email: null, reason: 'no_email' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return { shouldSend: false, email, reason: 'no_supabase' };
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // Check forum preferences
  if (FORUM_PREF_MAP[type]) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/forum_email_preferences?user_id=eq.${userId}&select=digest_frequency,notify_replies,notify_mentions,notify_follows`,
        { headers }
      );

      if (response.ok) {
        const rows = await response.json();
        if (rows.length > 0) {
          const prefs = rows[0];
          const col = FORUM_PREF_MAP[type];
          if (prefs[col] === false) {
            return { shouldSend: false, email, reason: 'preference_disabled' };
          }
        }
        // No row = defaults (enabled)
      }
    } catch {
      // On error, default to sending
    }

    return { shouldSend: true, email };
  }

  // Check marketplace preferences
  if (MARKETPLACE_PREF_MAP[type]) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/notification_preferences?user_id=eq.${userId}&select=email_enabled,${MARKETPLACE_PREF_MAP[type]}`,
        { headers }
      );

      if (response.ok) {
        const rows = await response.json();
        if (rows.length > 0) {
          const prefs = rows[0];
          // Global email toggle
          if (prefs.email_enabled === false) {
            return { shouldSend: false, email, reason: 'email_disabled_globally' };
          }
          // Per-type toggle
          const col = MARKETPLACE_PREF_MAP[type];
          if (prefs[col] === false) {
            return { shouldSend: false, email, reason: 'preference_disabled' };
          }
        }
        // No row = defaults (enabled)
      }
    } catch {
      // On error, default to sending
    }

    return { shouldSend: true, email };
  }

  // Types without preference mapping (user_approved, etc.) — send by default
  return { shouldSend: true, email };
}
