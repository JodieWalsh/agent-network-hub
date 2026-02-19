/**
 * Email Notification Helper
 *
 * Fire-and-forget function to trigger email sending via the send-email edge function.
 * Never blocks the calling code — errors are caught and logged silently.
 */

const getAuthHeaders = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let accessToken = supabaseKey;
  try {
    const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      accessToken = parsed?.access_token || supabaseKey;
    }
  } catch (e) {}

  return { supabaseUrl, supabaseKey, accessToken };
};

/**
 * Trigger an email notification via the send-email edge function.
 * Fire-and-forget — returns void, never throws.
 */
export function sendNotificationEmail(
  userId: string,
  type: string,
  data: Record<string, unknown>
): void {
  const { supabaseUrl, accessToken } = getAuthHeaders();

  fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, type, data }),
  }).catch((err) => {
    console.error('[email] Failed to trigger email:', err);
  });
}
