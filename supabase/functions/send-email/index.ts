import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/stripe.ts';
import { getResendClient, FROM_EMAIL, checkEmailPreferences } from '../_shared/email.ts';
import { getTemplateForType } from '../_shared/email-templates.ts';

/**
 * Send Email Edge Function
 *
 * Central email sending endpoint. Checks user preferences before sending.
 *
 * POST /functions/v1/send-email
 * Body: { userId, type, data, notificationId? }
 */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, type, data, notificationId } = await req.json();

    if (!userId || !type) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'userId and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check preferences
    const { shouldSend, email, reason } = await checkEmailPreferences(userId, type);

    if (!shouldSend) {
      console.log(`[send-email] Skipped for ${userId}: type=${type}, reason=${reason}`);
      return new Response(
        JSON.stringify({ status: 'skipped', reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get template
    const template = getTemplateForType(type, data || {});
    if (!template) {
      console.log(`[send-email] No template for type=${type}`);
      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'no_template' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Send via Resend
    const resend = getResendClient();
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email!],
      subject: template.subject,
      html: template.html,
    });

    if (sendError) {
      console.error(`[send-email] Resend error for ${userId}:`, sendError);
      return new Response(
        JSON.stringify({ status: 'error', message: sendError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Mark notification as delivered via email (if notificationId provided)
    if (notificationId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && serviceRoleKey) {
          await fetch(
            `${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`,
            {
              method: 'PATCH',
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ delivered_email: true }),
            }
          );
        }
      } catch {
        // Non-critical — email was still sent
      }
    }

    console.log(`[send-email] Sent ${type} email to ${email} for user ${userId}`);
    return new Response(
      JSON.stringify({ status: 'sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-email] Error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
