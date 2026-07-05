/**
 * geneva-lead-intake — PUBLIC write-only intake for Geneva
 * (Landing-Page Lead Capture, Piece 1 — docs/GENEVA_ROADMAP.md)
 *
 * Lets an unauthenticated landing-page visitor create ONE geneva_contacts
 * row. Write-only by construction:
 *   - returns { ok: true } and NOTHING else — no ids, no fields, no reads
 *     on behalf of the caller
 *   - duplicate emails return the SAME generic success (no email
 *     enumeration); internally the existing contact gets a 'source_captured'
 *     activity instead of a new row
 *   - sensitive fields are FORCED server-side: lifecycle_stage='new',
 *     owner_id=null, created_by=null; email_consent_status becomes
 *     'subscribed' ONLY when the explicit opt-in checkbox was ticked
 *   - Geneva's admin-only RLS is untouched; writes go through the service
 *     role inside this function (same pattern as stripe-webhook)
 *
 * Abuse protection (v1): origin allow-list (NOT the wildcard CORS the
 * internal functions use), honeypot field ("website" — bots that fill it
 * get a fake success and no insert), strict whitelists/length caps, and a
 * payload size cap. Per-IP rate limiting + captcha (Turnstile) are
 * deliberately deferred to Piece 2 (the real form) — recorded in the
 * roadmap.
 *
 * DEPLOY NOTE: this endpoint must be deployed with --no-verify-jwt
 * (public callers have no Supabase JWT).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');

// Browsers enforce CORS; only these origins may call from a page.
// (Non-browser callers bypass CORS by nature — the honeypot + validation
// layers below still apply to them.)
const ALLOWED_ORIGINS = new Set(
  [APP_URL, 'http://localhost:8081', 'http://localhost:8087'].filter(Boolean)
);

const PROFESSIONAL_TYPES = new Set([
  'buyers_agent', 'real_estate_agent', 'conveyancer',
  'mortgage_broker', 'building_and_pest_inspector', 'stylist',
]);

// utm_source values we recognise as first-class Geneva source tokens.
const KNOWN_SOURCES = new Set([
  'linkedin', 'instagram', 'tiktok', 'youtube', 'referral', 'direct',
  'podcast', 'event', 'partner',
]);

// Launch-region controlled vocabulary (waitlist Stage 1). Must stay in
// lockstep with the geneva_contacts.launch_regions CHECK constraint and
// LAUNCH_REGION_LABELS in src/lib/geneva.ts.
const LAUNCH_REGIONS = new Set([
  'greater_sydney', 'greater_melbourne', 'seq', 'greater_perth',
  'uk', 'us', 'other',
]);

/** Strictly whitelist + dedupe + cap the optional launch_regions array.
 *  Anything not in the vocabulary is silently dropped; empty → null. */
function cleanLaunchRegions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = [...new Set(
    value.filter((v): v is string => typeof v === 'string' && LAUNCH_REGIONS.has(v))
  )].slice(0, 7);
  return cleaned.length > 0 ? cleaned : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 8_192;

/** Trim + length-cap a free-text field; empty → null. */
function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function corsHeadersFor(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

const ok = (headers: Record<string, string>) =>
  new Response(JSON.stringify({ ok: true }), { status: 200, headers });
const reject = (headers: Record<string, string>, status = 400) =>
  new Response(JSON.stringify({ ok: false }), { status, headers });

async function rest(method: string, pathAndQuery: string, body?: unknown): Promise<Response> {
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

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = corsHeadersFor(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reject(headers, 405);
  // A browser page on a non-allowed origin gets no CORS grant; also refuse
  // outright so the response body never reaches it.
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reject(headers, 403);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return reject(headers, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reject(headers); }

    // Honeypot: real users never see/fill this field. Bots do.
    // Fake success — give scrapers nothing to learn from.
    if (clean(body.website, 200)) return ok(headers);

    const email = clean(body.email, 160);
    const firstName = clean(body.first_name, 80);
    if (!email || !EMAIL_RE.test(email) || !firstName) return reject(headers);

    const professionalType =
      typeof body.professional_type === 'string' && PROFESSIONAL_TYPES.has(body.professional_type)
        ? body.professional_type
        : 'buyers_agent';

    // Consent: ONLY an explicit boolean true becomes 'subscribed'.
    const consent = body.consent_opt_in === true ? 'subscribed' : 'pending';

    // Source attribution: utm_source → known token, else 'other';
    // no UTM at all → 'direct'. Raw UTMs are preserved in source_detail
    // and the timeline context.
    const utm: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = clean(body[k], 120);
      if (v) utm[k] = v;
    }
    const utmSource = utm.utm_source?.toLowerCase() ?? null;
    const originalSource = utmSource
      ? (KNOWN_SOURCES.has(utmSource) ? utmSource : 'other')
      : 'direct';
    const utmSummary = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(' ');
    const sourceDetail = clean(
      [clean(body.source_detail, 200), utmSummary ? `[${utmSummary}]` : null]
        .filter(Boolean)
        .join(' '),
      300
    );

    const launchRegions = cleanLaunchRegions(body.launch_regions);

    const contact = {
      first_name: firstName,
      last_name: clean(body.last_name, 80),
      email,
      phone: clean(body.phone, 40),
      company: clean(body.company, 120),
      professional_type: professionalType,
      region_city: clean(body.region_city, 120),
      launch_regions: launchRegions,
      source_detail: sourceDetail,
      original_source: originalSource,
      email_consent_status: consent,
      // Forced-safe server-side values — never caller-controlled:
      lifecycle_stage: 'new',
      owner_id: null,
      created_by: null,
      notes: null,
    };

    const activityContext = {
      professional_type: professionalType,
      original_source: originalSource,
      source: 'landing_page',
      ...(launchRegions ? { launch_regions: launchRegions } : {}),
      ...(Object.keys(utm).length > 0 ? { utm } : {}),
    };

    const insertRes = await rest('POST', 'geneva_contacts', [contact]);

    if (insertRes.status === 201) {
      const [row] = await insertRes.json();
      await rest('POST', 'geneva_activities', [{
        contact_id: row.id,
        actor_user_id: null,
        event_type: 'contact_created',
        event_context: activityContext,
      }]).catch(() => {});
      return ok(headers);
    }

    if (insertRes.status === 409) {
      // Duplicate email. Same generic success — never reveal existence.
      // Internally, enrich the existing contact with a repeat-signup event.
      // (This narrow email→id lookup is service-side only; nothing about it
      // is ever returned to the caller.)
      const lookup = await rest(
        'GET',
        `geneva_contacts?email=ilike.${encodeURIComponent(email.replace(/([%_\\])/g, '\\$1'))}&select=id&limit=1`
      );
      const rows = lookup.ok ? await lookup.json() : [];
      if (rows[0]?.id) {
        await rest('POST', 'geneva_activities', [{
          contact_id: rows[0].id,
          actor_user_id: null,
          event_type: 'source_captured',
          event_context: { ...activityContext, repeat_signup: true },
        }]).catch(() => {});
      }
      return ok(headers);
    }

    console.error('geneva-lead-intake insert failed:', insertRes.status, await insertRes.text());
    return reject(headers, 500);
  } catch (err) {
    console.error('geneva-lead-intake error:', err);
    return reject(headers, 500);
  }
});
