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
export const FROM_EMAIL = 'Buyers Agent Hub <hello@buyersagenthub.com>';

export const APP_URL = Deno.env.get('APP_URL') || 'https://buyersagenthub.com';

function getServiceRoleKey(): string | null {
  const secretKeysJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeysJson) {
    console.log('[send-email] missing SUPABASE_SECRET_KEYS');
    return null;
  }

  try {
    const secretKeys = JSON.parse(secretKeysJson);
    return Object.values(secretKeys)[0] as string;
  } catch (error) {
    console.log('[send-email] failed to parse SUPABASE_SECRET_KEYS:', String(error));
    return null;
  }
}

/**
 * Get a user's email address from Supabase
 * Tries auth admin API first, falls back to profiles table
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = getServiceRoleKey();

  if (!serviceRoleKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userId}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const data = await response.json();
    console.log('[send-email] auth admin response:', { status: response.status, ok: response.ok, data });

    if (data?.email) {
      return data.email;
    }
  } catch (error) {
    console.log('[send-email] auth admin lookup failed:', String(error));
  }

  try {
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=email&id=eq.${userId}&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const profileData = await profileResponse.json();
    console.log('[send-email] profiles fallback response:', { status: profileResponse.status, ok: profileResponse.ok, profileData });

    if (Array.isArray(profileData) && profileData.length > 0 && profileData[0]?.email) {
      return profileData[0].email;
    }
  } catch (error) {
    console.log('[send-email] profiles lookup failed:', String(error));
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
  const serviceRoleKey = getServiceRoleKey();
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
