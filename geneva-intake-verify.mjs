/**
 * Geneva lead-intake verification — Landing-Page Lead Capture, Piece 1.
 *
 * Hits the DEPLOYED public endpoint with NO auth (exactly like a landing
 * page visitor) and proves:
 *   1. Normal POST → contact created with FORCED-safe defaults even when the
 *      caller tries to smuggle lifecycle_stage/owner_id/created_by — plus
 *      the 'contact_created' activity with source='landing_page' + utm
 *   2. consent_opt_in true → 'subscribed'; absent → 'pending' (and a bogus
 *      professional_type falls back to buyers_agent)
 *   3. Honeypot filled → fake { ok: true }, NO row created
 *   4. Duplicate email (different case) → generic { ok: true }, NO new row,
 *      'source_captured' activity appended to the existing contact
 *   5. Invalid email → { ok: false }, no row
 *   6. anon still reads ZERO rows from all four geneva_* tables
 * Cleanup: all geneva_* tables back to 0 rows.
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SECRET || !ANON) { console.error('Missing env'); process.exit(1); }

const FN_URL = `${SUPABASE_URL}/functions/v1/geneva-lead-intake`;

const svcHeaders = {
  apikey: SECRET, Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json', Prefer: 'return=representation',
};
async function svc(method, pathAndQuery, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method, headers: svcHeaders, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} failed ${res.status}: ${await res.text()}`);
  return method === 'DELETE' ? null : res.json();
}
async function svcCount(q) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
    method: 'HEAD', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, Prefer: 'count=exact' },
  });
  const t = res.headers.get('content-range')?.split('/')[1];
  return t && t !== '*' ? parseInt(t, 10) : -1;
}

/** POST to the intake exactly like a public visitor: no auth headers at all. */
async function intake(body) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const EMAIL_A = 'test.lead.capture@example.com';
const EMAIL_B = 'test.lead.pending@example.com';

(async () => {
  console.log('Pre-state:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }

  // --- 1. Normal POST with consent + UTM + smuggled sensitive fields ---
  const r1 = await intake({
    first_name: 'TEST Lead',
    last_name: 'Capture',
    email: EMAIL_A,
    phone: '0400 333 444',
    company: 'Lead Capture Realty',
    professional_type: 'buyers_agent',
    region_city: 'Sydney',
    source_detail: 'Clicked the launch announcement link',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'prelaunch-waitlist',
    consent_opt_in: true,
    // Smuggling attempts — must ALL be ignored/forced server-side:
    lifecycle_stage: 'active_customer',
    owner_id: '00000000-0000-0000-0000-000000000001',
    created_by: '00000000-0000-0000-0000-000000000001',
    notes: 'hacked note',
    email_consent_status: 'subscribed',
  });
  console.log('\n1. Normal POST:', r1.status, JSON.stringify(r1.json),
    r1.status === 200 && JSON.stringify(r1.json) === '{"ok":true}' ? '(response is ONLY {ok:true} ✓)' : '(UNEXPECTED!)');
  const [c1] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(EMAIL_A)}&select=*`);
  console.log('   lifecycle_stage:', c1.lifecycle_stage, c1.lifecycle_stage === 'new' ? '✓ (smuggle blocked)' : 'FAIL');
  console.log('   owner_id:', c1.owner_id, c1.owner_id === null ? '✓' : 'FAIL');
  console.log('   created_by:', c1.created_by, c1.created_by === null ? '✓' : 'FAIL');
  console.log('   notes:', c1.notes, c1.notes === null ? '✓ (smuggle blocked)' : 'FAIL');
  console.log('   consent:', c1.email_consent_status, c1.email_consent_status === 'subscribed' ? '✓ (opt-in honoured)' : 'FAIL');
  console.log('   original_source:', c1.original_source, c1.original_source === 'linkedin' ? '✓ (utm mapped)' : 'FAIL');
  console.log('   source_detail:', JSON.stringify(c1.source_detail));
  const a1 = await svc('GET', `geneva_activities?contact_id=eq.${c1.id}&event_type=eq.contact_created&select=event_context,actor_user_id`);
  console.log('   contact_created activity:', a1.length, JSON.stringify(a1[0]?.event_context),
    a1[0]?.event_context?.source === 'landing_page' && a1[0]?.actor_user_id === null ? '✓' : 'FAIL');

  // --- 2. No consent + bogus professional_type → pending + buyers_agent ---
  const r2 = await intake({
    first_name: 'TEST Pending',
    email: EMAIL_B,
    professional_type: 'evil_hacker_type',
    utm_source: 'somewhere-unknown',
  });
  console.log('\n2. No-consent POST:', r2.status, JSON.stringify(r2.json));
  const [c2] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(EMAIL_B)}&select=id,email_consent_status,professional_type,original_source`);
  console.log('   consent:', c2.email_consent_status, c2.email_consent_status === 'pending' ? '✓ (no auto-subscribe)' : 'FAIL');
  console.log('   professional_type:', c2.professional_type, c2.professional_type === 'buyers_agent' ? '✓ (bogus → default)' : 'FAIL');
  console.log('   original_source:', c2.original_source, c2.original_source === 'other' ? '✓ (unknown utm → other)' : 'FAIL');

  // --- 3. Honeypot ---
  const preHoney = await svcCount('geneva_contacts?select=id');
  const r3 = await intake({
    first_name: 'TEST Bot', email: 'test.bot@example.com', website: 'https://spam.example.com',
  });
  const postHoney = await svcCount('geneva_contacts?select=id');
  console.log('\n3. Honeypot POST:', r3.status, JSON.stringify(r3.json),
    r3.status === 200 && postHoney === preHoney ? '(fake success, NO row ✓)' : 'FAIL');

  // --- 4. Duplicate email, different case ---
  const preDup = await svcCount('geneva_contacts?select=id');
  const r4 = await intake({
    first_name: 'TEST Duplicate', email: 'TEST.LEAD.CAPTURE@EXAMPLE.COM',
    utm_source: 'tiktok', consent_opt_in: true,
  });
  const postDup = await svcCount('geneva_contacts?select=id');
  console.log('\n4. Duplicate POST:', r4.status, JSON.stringify(r4.json),
    JSON.stringify(r4.json) === '{"ok":true}' ? '(generic success — no enumeration ✓)' : 'FAIL');
  console.log('   contacts count:', preDup, '→', postDup, postDup === preDup ? '(no new row ✓)' : 'FAIL');
  const a4 = await svc('GET', `geneva_activities?contact_id=eq.${c1.id}&event_type=eq.source_captured&select=event_context`);
  console.log('   source_captured on original:', a4.length, JSON.stringify(a4[0]?.event_context),
    a4[0]?.event_context?.repeat_signup === true && a4[0]?.event_context?.original_source === 'tiktok' ? '✓' : 'FAIL');
  // Consent must NOT have been changed by the duplicate attempt
  const [c1b] = await svc('GET', `geneva_contacts?id=eq.${c1.id}&select=email_consent_status,first_name`);
  console.log('   original untouched:', JSON.stringify(c1b), c1b.first_name === 'TEST Lead' ? '✓' : 'FAIL');

  // --- 5. Invalid email rejected ---
  const preBad = await svcCount('geneva_contacts?select=id');
  const r5 = await intake({ first_name: 'TEST Bad', email: 'not-an-email' });
  const postBad = await svcCount('geneva_contacts?select=id');
  console.log('\n5. Invalid-email POST:', r5.status, JSON.stringify(r5.json),
    r5.status === 400 && postBad === preBad ? '(rejected, no row ✓)' : 'FAIL');

  // --- 6. anon still reads ZERO rows from all four tables ---
  console.log('\n6. anon read check (publishable key, no login):');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    const body = await res.text();
    console.log(`   ${t}: ${res.status} body=${body.slice(0, 40)}`, body === '[]' ? '✓ zero rows' : 'LEAK — FAIL!');
  }
  // And anon cannot INSERT directly either (RLS untouched)
  const anonInsert = await fetch(`${SUPABASE_URL}/rest/v1/geneva_contacts`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: 'X', email: 'anon.direct@example.com' }),
  });
  console.log('   anon direct INSERT:', anonInsert.status, anonInsert.status === 401 || anonInsert.status === 403 ? '(blocked ✓)' : 'FAIL');

  // --- Cleanup ---
  console.log('\nCleaning up test data...');
  await svc('DELETE', `geneva_contacts?email=in.("${EMAIL_A}","${EMAIL_B}")`);
  console.log('Final counts:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  console.log(`\nTEST IDS — contact A (consented): ${c1.id}, contact B (pending): ${c2.id}`);
  const done = await svc('GET', `geneva_contacts?select=id`);
  console.log('Remaining contacts:', done.length);
  process.exit(0);
})();
