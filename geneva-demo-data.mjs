/**
 * geneva-demo-data.mjs — TEMPORARY demo data for Geneva (Dani's review).
 *
 *   node geneva-demo-data.mjs seed    → create ~24 fake contacts + notes/tasks/activities
 *   node geneva-demo-data.mjs status  → count demo vs real rows
 *   node geneva-demo-data.mjs wipe    → delete ONLY demo rows (by email domain)
 *
 * SAFETY DESIGN:
 *  - Every fake contact's email ends in @geneva-demo.example (.example is a
 *    reserved TLD — can never receive mail, can never be a real lead).
 *  - Wipe deletes ONLY rows matching that domain (cascade removes their
 *    notes/tasks/activities). REAL waitlist leads are never touched — the
 *    landing form is live, so real rows may coexist with demo rows.
 *  - No demo contact ever gets mailchimp_status set: none look pushed, and
 *    the push button stays a deliberate act. (Do NOT push demo contacts —
 *    Mailchimp would reject the .example domain anyway.)
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const DEMO_DOMAIN = 'geneva-demo.example';
const mode = process.argv[2];

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
const daysAgo = (d, hourOffset = 0) =>
  new Date(Date.now() - d * 86400000 + hourOffset * 3600000).toISOString();
const email = (first, last) => `${first}.${last}`.toLowerCase() + '@' + DEMO_DOMAIN;

/* ------------------------------------------------------------- the cast
   Plausible names (so the dashboard reads real for Dani), identifiable as
   fake ONLY by the email domain. Spread designed for Phase 4 widgets:
   types (buyers agents weighted), stages, sources, consent, AU/UK/US mix,
   created_at spread over ~3 weeks so stage ages and "Added" dates vary. */
const CONTACTS = [
  // --- Buyers Agents (10 — the focus) ---
  { f: 'Ava', l: 'Pemberton', t: 'buyers_agent', stage: 'new', src: 'linkedin', consent: 'subscribed', city: 'Sydney', days: 1, company: 'Pemberton Property Advocates' },
  { f: 'Marcus', l: 'Whitfield', t: 'buyers_agent', stage: 'new', src: 'instagram', consent: 'pending', city: 'London', days: 2, company: 'Whitfield Home Search' },
  { f: 'Priya', l: 'Chandran', t: 'buyers_agent', stage: 'engaged', src: 'referral', consent: 'subscribed', city: 'Melbourne', days: 5, company: 'Northside Buyers Co', notes: ['Warm intro from a mutual contact — very keen on the inspection marketplace.'], tasks: [{ title: 'Book discovery call', due: 2, priority: 'high' }] },
  { f: 'Eleanor', l: 'Hastings', t: 'buyers_agent', stage: 'engaged', src: 'event', consent: 'subscribed', city: 'Bristol', days: 7, company: 'Hastings & Co', tasks: [{ title: 'Send founding-cohort pricing', due: -2, priority: 'urgent' }] },
  { f: 'Jackson', l: 'Delgado', t: 'buyers_agent', stage: 'qualified', src: 'podcast', consent: 'subscribed', city: 'Austin', days: 9, company: 'Delgado Buyer Advocacy', notes: ['Runs a 3-person team — asked about multi-seat pricing.'] },
  { f: 'Sofia', l: 'Lindqvist', t: 'buyers_agent', stage: 'qualified', src: 'linkedin', consent: 'pending', city: 'Perth', days: 11, company: 'Westside Property Buyers' },
  { f: 'Oliver', l: 'Beaumont', t: 'buyers_agent', stage: 'nurturing', src: 'youtube', consent: 'subscribed', city: 'Manchester', days: 14, company: 'Beaumont Residential', tasks: [{ title: 'Follow up after webinar', due: 1, priority: 'medium' }, { title: 'Share overlays sneak peek', completedDaysAgo: 3 }] },
  { f: 'Harriet', l: 'Kowalski', t: 'buyers_agent', stage: 'trial_early_access', src: 'referral', consent: 'subscribed', city: 'Brisbane', days: 17, company: 'HK Buyers Agency', notes: ['In the early-access group — gave brilliant feedback on the client brief flow.'] },
  { f: 'Theo', l: 'Marchetti', t: 'buyers_agent', stage: 'active_customer', src: 'direct', consent: 'subscribed', city: 'Adelaide', days: 21, company: 'Marchetti Property Group', notes: ['Signed! First paying founding member. Watch for referrals from his network.'] },
  { f: 'Isla', l: 'Rutherford', t: 'buyers_agent', stage: 'inactive', inactiveReason: 'not_ready_yet', src: 'instagram', consent: 'pending', city: 'Gold Coast', days: 19, company: 'Rutherford Homes' },
  // --- Real Estate Agents (4) ---
  { f: 'Damon', l: 'Okafor', t: 'real_estate_agent', stage: 'new', src: 'tiktok', consent: 'pending', city: 'Charlotte', days: 1 },
  { f: 'Lucia', l: 'Fernandez', t: 'real_estate_agent', stage: 'engaged', src: 'instagram', consent: 'subscribed', city: 'San Diego', days: 6, company: 'Fernandez Realty', tasks: [{ title: 'Intro call — partnerships angle', due: 3, priority: 'medium' }] },
  { f: 'Callum', l: 'Douglas', t: 'real_estate_agent', stage: 'nurturing', src: 'event', consent: 'pending', city: 'Edinburgh', days: 13 },
  { f: 'Renee', l: 'Vandermeer', t: 'real_estate_agent', stage: 'inactive', inactiveReason: 'no_response', src: 'linkedin', consent: 'unsubscribed', city: 'Denver', days: 20 },
  // --- Conveyancers (3) ---
  { f: 'Margot', l: 'Ellery', t: 'conveyancer', stage: 'engaged', src: 'referral', consent: 'subscribed', city: 'Sydney', days: 4, company: 'Ellery Conveyancing', notes: ['Wants to be listed when the directory opens to conveyancers.'] },
  { f: 'Hugh', l: 'Braithwaite', t: 'conveyancer', stage: 'new', src: 'direct', consent: 'pending', city: 'London', days: 3 },
  { f: 'Anika', l: 'Sorensen', t: 'conveyancer', stage: 'nurturing', src: 'partner', consent: 'subscribed', city: 'Melbourne', days: 15, tasks: [{ title: 'Add to conveyancer beta list', due: 5, priority: 'low' }] },
  // --- Mortgage Brokers (3) ---
  { f: 'Felix', l: 'Nakamura', t: 'mortgage_broker', stage: 'qualified', src: 'podcast', consent: 'subscribed', city: 'Portland', days: 8, company: 'Nakamura Lending' },
  { f: 'Georgia', l: 'Ashworth', t: 'mortgage_broker', stage: 'new', src: 'linkedin', consent: 'pending', city: 'Brisbane', days: 2 },
  { f: 'Rohan', l: 'Mistry', t: 'mortgage_broker', stage: 'nurturing', src: 'event', consent: 'unsubscribed', city: 'Manchester', days: 16 },
  // --- Building & Pest Inspectors (2) ---
  { f: 'Stanley', l: 'Okonkwo', t: 'building_and_pest_inspector', stage: 'engaged', src: 'referral', consent: 'subscribed', city: 'Perth', days: 5, company: 'Okonkwo Inspections', notes: ['Interested in the Spotlights marketplace — does 15 inspections/week.'], tasks: [{ title: 'Walk through inspector onboarding', due: -1, priority: 'high' }] },
  { f: 'Bridget', l: 'Callahan', t: 'building_and_pest_inspector', stage: 'qualified', src: 'other', consent: 'subscribed', city: 'Austin', days: 10, source_detail: 'Found us via an industry newsletter' },
  // --- Stylists (2) ---
  { f: 'Camille', l: 'Devereux', t: 'stylist', stage: 'new', src: 'instagram', consent: 'subscribed', city: 'Sydney', days: 1, company: 'Devereux Staging' },
  { f: 'Nate', l: 'Silverman', t: 'stylist', stage: 'trial_early_access', src: 'referral', consent: 'pending', city: 'San Diego', days: 18 },
];

/* Launch regions per contact (city-consistent; a few multi-region, a few
   deliberately region-less so the dashboard's "No region set" line shows). */
const REGION_PLAN = {
  'ava.pemberton': ['greater_sydney'], 'marcus.whitfield': ['uk'],
  'priya.chandran': ['greater_melbourne', 'greater_sydney'], 'eleanor.hastings': ['uk'],
  'jackson.delgado': ['us'], 'sofia.lindqvist': ['greater_perth'],
  'oliver.beaumont': ['uk'], 'harriet.kowalski': ['seq'],
  'theo.marchetti': ['other'], 'isla.rutherford': ['seq'],
  'damon.okafor': ['us'], 'lucia.fernandez': ['us'],
  'callum.douglas': ['uk'], 'renee.vandermeer': ['us'],
  'margot.ellery': ['greater_sydney'], 'hugh.braithwaite': ['uk'],
  'anika.sorensen': ['greater_melbourne'], 'felix.nakamura': ['us'],
  'georgia.ashworth': ['seq'], 'rohan.mistry': ['uk'],
  'stanley.okonkwo': ['greater_perth'],
};

const STAGE_BEFORE = {
  engaged: 'new', qualified: 'engaged', nurturing: 'engaged',
  trial_early_access: 'qualified', active_customer: 'trial_early_access', inactive: 'engaged',
};

async function seed() {
  const admins = await svc('GET', 'profiles?role=eq.admin&select=id,full_name&order=created_at.asc');
  if (admins.length === 0) throw new Error('No admin profiles found');
  const preTotal = await svcCount('geneva_contacts?select=id');
  const preDemo = await svcCount(`geneva_contacts?select=id&email=like.*%40${DEMO_DOMAIN}`);
  if (preDemo > 0) {
    console.log(`Demo data already present (${preDemo} rows) — run "wipe" first if you want a fresh seed.`);
    process.exit(1);
  }
  console.log(`Seeding ${CONTACTS.length} demo contacts (existing real rows: ${preTotal})...`);

  let nNotes = 0, nTasks = 0, nActs = 0;
  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[i];
    const owner = admins[i % admins.length];
    const createdAt = daysAgo(c.days, -(i % 8)); // spread times of day a little
    const [row] = await svc('POST', 'geneva_contacts', [{
      launch_regions: REGION_PLAN[`${c.f}.${c.l}`.toLowerCase()] ?? null,
      first_name: c.f, last_name: c.l, email: email(c.f, c.l),
      phone: c.days % 3 === 0 ? `0400 ${String(100 + i).padStart(3, '0')} ${String(200 + i).padStart(3, '0')}` : null,
      company: c.company ?? null,
      professional_type: c.t, region_city: c.city,
      lifecycle_stage: c.stage,
      inactive_reason: c.inactiveReason ?? null,
      owner_id: owner.id,
      original_source: c.src, source_detail: c.source_detail ?? null,
      email_consent_status: c.consent,
      notes: null, created_by: admins[0].id, created_at: createdAt,
      // mailchimp_status deliberately never set — no demo contact looks pushed
    }]);

    // Timeline: contact_created at creation time
    const acts = [{
      contact_id: row.id, actor_user_id: admins[0].id, event_type: 'contact_created',
      event_context: { professional_type: c.t, original_source: c.src },
      created_at: createdAt,
    }];
    // A believable stage_changed entry for anyone past 'new'
    if (c.stage !== 'new' && STAGE_BEFORE[c.stage]) {
      acts.push({
        contact_id: row.id, actor_user_id: owner.id, event_type: 'stage_changed',
        event_context: {
          from: STAGE_BEFORE[c.stage], to: c.stage,
          ...(c.inactiveReason ? { reason: c.inactiveReason } : {}),
        },
        created_at: daysAgo(Math.max(0, c.days - 2)),
      });
    }

    for (const body of c.notes ?? []) {
      await svc('POST', 'geneva_notes', [{
        contact_id: row.id, body, created_by: owner.id, created_at: daysAgo(Math.max(0, c.days - 1)),
      }]);
      acts.push({
        contact_id: row.id, actor_user_id: owner.id, event_type: 'note_added',
        event_context: { excerpt: body.slice(0, 120) }, created_at: daysAgo(Math.max(0, c.days - 1)),
      });
      nNotes++;
    }

    for (const task of c.tasks ?? []) {
      const completed = task.completedDaysAgo !== undefined;
      await svc('POST', 'geneva_tasks', [{
        contact_id: row.id, title: task.title, owner_id: owner.id,
        // task.due = days from now (negative ⇒ already overdue)
        due_at: completed
          ? daysAgo(task.completedDaysAgo + 2)
          : new Date(Date.now() + task.due * 86400000).toISOString(),
        priority: task.priority ?? 'medium',
        status: completed ? 'completed' : 'open',
        completed_at: completed ? daysAgo(task.completedDaysAgo) : null,
        created_by: owner.id, created_at: daysAgo(Math.max(0, c.days - 1)),
      }]);
      acts.push({
        contact_id: row.id, actor_user_id: owner.id,
        event_type: completed ? 'task_completed' : 'task_created',
        event_context: { title: task.title }, created_at: daysAgo(Math.max(0, c.days - 1)),
      });
      nTasks++;
    }

    await svc('POST', 'geneva_activities', acts);
    nActs += acts.length;
    process.stdout.write('.');
  }

  console.log(`\n\nSeeded: ${CONTACTS.length} contacts, ${nNotes} notes, ${nTasks} tasks, ${nActs} activities.`);
  await status();
  console.log('\n⚠️  TEMPORARY DEMO DATA — wipe after Dani reviews:  node geneva-demo-data.mjs wipe');
}

async function status() {
  console.log('\nStatus:');
  const total = await svcCount('geneva_contacts?select=id');
  const demo = await svcCount(`geneva_contacts?select=id&email=like.*%40${DEMO_DOMAIN}`);
  console.log(`  geneva_contacts: ${total} total = ${demo} demo + ${total - demo} REAL`);
  for (const t of ['geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} total`);
  }
}

async function wipe() {
  const demoBefore = await svcCount(`geneva_contacts?select=id&email=like.*%40${DEMO_DOMAIN}`);
  const realBefore = (await svcCount('geneva_contacts?select=id')) - demoBefore;
  console.log(`Wiping ${demoBefore} demo contacts (cascade removes their notes/tasks/activities)...`);
  console.log(`REAL contacts present (will NOT be touched): ${realBefore}`);
  // Deletes ONLY the demo domain — real waitlist leads are untouched.
  await svc('DELETE', `geneva_contacts?email=like.*%40${DEMO_DOMAIN}`);
  const demoAfter = await svcCount(`geneva_contacts?select=id&email=like.*%40${DEMO_DOMAIN}`);
  const realAfter = (await svcCount('geneva_contacts?select=id'));
  console.log(`\nDemo rows remaining: ${demoAfter} ${demoAfter === 0 ? '✓' : '— WIPE INCOMPLETE!'}`);
  console.log(`Rows remaining overall: ${realAfter} (real leads preserved: ${realAfter === realBefore ? '✓' : 'COUNT CHANGED — check!'})`);
  await status();
  if (realAfter === 0) console.log('\nAll geneva_* content tables back to empty (no real leads existed).');
}

if (mode === 'seed') seed().catch((e) => { console.error(e); process.exit(1); });
else if (mode === 'wipe') wipe().catch((e) => { console.error(e); process.exit(1); });
else if (mode === 'status') status().catch((e) => { console.error(e); process.exit(1); });
else { console.log('Usage: node geneva-demo-data.mjs seed | status | wipe'); process.exit(1); }
