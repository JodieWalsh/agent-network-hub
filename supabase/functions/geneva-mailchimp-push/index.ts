/**
 * geneva-mailchimp-push — Geneva Phase 3: one-way Mailchimp push.
 *
 * ADMIN-ONLY, explicit-button-only. Given { contactId }:
 *   1. Authenticates the caller (deployed WITH JWT verification — no
 *      --no-verify-jwt) and RE-CHECKS server-side that they are an admin
 *      (profiles.role = 'admin' via service role — never trusts the client).
 *   2. Fetches the contact server-side and RE-VERIFIES the firm rule:
 *      only email_consent_status = 'subscribed' is EVER pushed. Anything
 *      else is politely refused — pending/unsubscribed/bounced/complained
 *      can never reach Mailchimp even if the UI misbehaves.
 *   3. Upserts the member into the audience (PUT by md5(lower(email)) —
 *      pushing twice updates, never duplicates). status_if_new='subscribed';
 *      the status of an EXISTING Mailchimp member is deliberately NOT
 *      forced (never resubscribe someone who unsubscribed in Mailchimp).
 *   4. Applies tags: "Geneva CRM" + the professional-type label.
 *   5. Records mailchimp_status ('synced'/'error') + mailchimp_synced_at on
 *      the contact and writes a 'pushed_to_mailchimp' timeline entry.
 *
 * The API key comes from the MAILCHIMP_API_KEY secret and is never logged
 * or returned. Responses carry only { ok, reason?, synced_at? }.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// trim() everywhere: pasted secrets often carry a trailing newline, which
// silently corrupts the auth header and datacenter (seen in the wild here —
// Mailchimp answered "linked to a different datacenter").
const MC_KEY = (Deno.env.get('MAILCHIMP_API_KEY') ?? '').trim();
// Mailchimp keys carry their datacenter as a suffix (e.g. "...-us19") and
// the API rejects calls sent to any other datacenter. Derive the DC from
// the key itself (authoritative); the MAILCHIMP_SERVER_PREFIX secret is
// only a fallback for keys without a suffix.
const MC_SERVER = ((MC_KEY.includes('-') ? MC_KEY.split('-').pop() : '') ||
  (Deno.env.get('MAILCHIMP_SERVER_PREFIX') ?? '')).trim();
const MC_AUDIENCE = (Deno.env.get('MAILCHIMP_AUDIENCE_ID') ?? '').trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  buyers_agent: 'Buyers Agent',
  real_estate_agent: 'Real Estate Agent',
  conveyancer: 'Conveyancer',
  mortgage_broker: 'Mortgage Broker',
  building_and_pest_inspector: 'Building and Pest Inspector',
  stylist: 'Stylist',
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', instagram: 'Instagram', tiktok: 'TikTok',
  youtube: 'YouTube', referral: 'Referral', direct: 'Direct',
  podcast: 'Podcast', event: 'Event', partner: 'Partner',
  manual_import: 'Manual Import', other: 'Other',
};

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function svc(method: string, pathAndQuery: string, body?: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function md5Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('MD5', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { ok: false });

  try {
    if (!MC_KEY || !MC_SERVER || !MC_AUDIENCE) {
      console.error('geneva-mailchimp-push: Mailchimp secrets not configured');
      return respond(500, { ok: false, reason: 'not_configured' });
    }

    // --- 1. Resolve the caller and re-check admin server-side ---
    const authHeader = req.headers.get('authorization') ?? '';
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: authHeader },
    });
    if (!userRes.ok) return respond(401, { ok: false });
    const caller = await userRes.json();
    if (!caller?.id) return respond(401, { ok: false });

    const profRes = await svc('GET', `profiles?id=eq.${caller.id}&select=role`);
    const [prof] = profRes.ok ? await profRes.json() : [];
    if (prof?.role !== 'admin') return respond(403, { ok: false });

    // --- 2. Fetch contact + re-verify the firm consent rule ---
    const { contactId } = await req.json().catch(() => ({}));
    if (!contactId || typeof contactId !== 'string') return respond(400, { ok: false });

    const cRes = await svc(
      'GET',
      `geneva_contacts?id=eq.${encodeURIComponent(contactId)}&select=id,email,first_name,last_name,professional_type,region_city,original_source,email_consent_status`
    );
    const [contact] = cRes.ok ? await cRes.json() : [];
    if (!contact) return respond(404, { ok: false });

    if (contact.email_consent_status !== 'subscribed') {
      // Polite refusal — the firm rule. No Mailchimp call is ever made.
      return respond(409, { ok: false, reason: 'not_subscribed' });
    }

    // --- 3. Upsert into the audience ---
    const ptypeLabel = PROFESSIONAL_TYPE_LABELS[contact.professional_type] ?? contact.professional_type;
    const memberHash = await md5Hex(contact.email.toLowerCase());
    const mcAuth = 'Basic ' + btoa(`any:${MC_KEY}`);
    const memberUrl = `https://${MC_SERVER}.api.mailchimp.com/3.0/lists/${MC_AUDIENCE}/members/${memberHash}`;

    const upsertRes = await fetch(memberUrl, {
      method: 'PUT',
      headers: { Authorization: mcAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: contact.email,
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: contact.first_name ?? '',
          LNAME: contact.last_name ?? '',
          PTYPE: ptypeLabel,
          REGION: contact.region_city ?? '',
          SOURCE: contact.original_source
            ? (SOURCE_LABELS[contact.original_source] ?? contact.original_source)
            : '',
        },
      }),
    });

    const now = new Date().toISOString();

    if (!upsertRes.ok) {
      // Log Mailchimp's error detail server-side (never the key). The
      // response goes only to authenticated ADMINS, so surfacing
      // Mailchimp's error title/detail is safe and helps them fix setup
      // issues (bad audience id, missing merge field, etc.).
      const errBody = await upsertRes.text();
      console.error('Mailchimp upsert failed:', upsertRes.status, errBody.slice(0, 300));
      let mcTitle = '';
      let mcDetail = '';
      try {
        const parsed = JSON.parse(errBody);
        mcTitle = parsed?.title ?? '';
        mcDetail = (parsed?.detail ?? '').slice(0, 200);
      } catch {}
      await svc('PATCH', `geneva_contacts?id=eq.${contact.id}`, {
        mailchimp_status: 'error',
      }).catch(() => {});
      return respond(502, {
        ok: false,
        reason: 'mailchimp_rejected',
        mc_status: upsertRes.status,
        mc_title: mcTitle,
        mc_detail: mcDetail,
        // Diagnostics (admin-only response; the DC is not a secret):
        mc_dc_used: MC_SERVER,
        mc_dc_source: MC_KEY.includes('-') ? 'key_suffix' : 'fallback_secret',
      });
    }

    // --- 4. Tags (best-effort; a tag failure doesn't fail the push) ---
    await fetch(`${memberUrl}/tags`, {
      method: 'POST',
      headers: { Authorization: mcAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: [
          { name: 'Geneva CRM', status: 'active' },
          { name: ptypeLabel, status: 'active' },
        ],
      }),
    }).catch((e) => console.error('Mailchimp tags failed:', e));

    // --- 5. Record the sync + timeline entry ---
    const patchRes = await svc('PATCH', `geneva_contacts?id=eq.${contact.id}`, {
      mailchimp_status: 'synced',
      mailchimp_synced_at: now,
    });
    if (!patchRes.ok) console.error('Sync-status patch failed:', await patchRes.text());

    await svc('POST', 'geneva_activities', [{
      contact_id: contact.id,
      actor_user_id: caller.id,
      event_type: 'pushed_to_mailchimp',
      event_context: {
        professional_type: contact.professional_type,
        tags: ['Geneva CRM', ptypeLabel],
      },
    }]).catch((e) => console.error('Timeline write failed:', e));

    return respond(200, { ok: true, synced_at: now });
  } catch (err) {
    console.error('geneva-mailchimp-push error:', err);
    return respond(500, { ok: false });
  }
});
