/**
 * Geneva Phase 3 verification — the one-way Mailchimp push.
 *
 * Proves, against the DEPLOYED geneva-mailchimp-push function:
 *   1. No auth → blocked at the gateway (JWT verification is ON)
 *   2. Non-admin (real temp auth user) → 403
 *   3. PENDING contact → polite 409 refusal, mailchimp_status stays null,
 *      no activity (the firm subscribed-only rule, server-side)
 *   4. SUBSCRIBED contact via the real UI button → { ok: true },
 *      mailchimp_status='synced' + mailchimp_synced_at + timeline entry;
 *      the "In Mailchimp" chip appears near the consent dot
 *   5. Second push → idempotent (still ok; upsert, no duplicate member)
 *   6. Disabled button + quiet note on the pending contact's record
 * Cleanup: geneva_* back to 0 rows; temp user deleted.
 *
 * NOTE: the script cannot query Mailchimp itself (the API key deliberately
 * lives only in Supabase secrets). Jodie confirms the test member appears in
 * audience 606099323d and deletes it there afterwards.
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const baseUrl = 'http://localhost:8081';
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SECRET || !ANON) { console.error('Missing env'); process.exit(1); }

const FN_URL = `${SUPABASE_URL}/functions/v1/geneva-mailchimp-push`;
// Obvious, real, deliverable test address (Jodie's inbox, plus-tagged) so it
// is easy to find and delete in the Mailchimp audience afterwards.
const TEST_EMAIL = 'jlralph+geneva-mailchimp-test@gmail.com';

const screenshotDir = './screenshots/geneva-mailchimp';
fs.mkdirSync(screenshotDir, { recursive: true });

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
async function passwordGrant(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data?.access_token ?? null;
}
async function callPush(token, contactId) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: 'POST', headers, body: JSON.stringify({ contactId }) });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

/* Same WCAG audit as the other verify scripts */
async function contrastAudit(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const el of document.querySelectorAll('*')) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim()).join(' ').trim();
      if (!ownText) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) continue;
      const fgMatch = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!fgMatch) continue;
      const fg = { r: +fgMatch[1], g: +fgMatch[2], b: +fgMatch[3] };
      let bg = null; let node = el;
      while (node && node !== document.documentElement) {
        const s = window.getComputedStyle(node);
        const m = s.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) { bg = { r: +m[1], g: +m[2], b: +m[3] }; break; }
        if (s.backgroundImage && s.backgroundImage.includes('gradient')) {
          const stops = [...s.backgroundImage.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)];
          const solid = stops.find((m) => m[4] === undefined || parseFloat(m[4]) >= 0.5);
          if (solid) { bg = { r: +solid[1], g: +solid[2], b: +solid[3] }; break; }
        }
        node = node.parentElement;
      }
      if (!bg) bg = { r: 255, g: 255, b: 255 };
      const lum = (c) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      const l1 = lum(fg), l2 = lum(bg);
      const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const fontSize = parseFloat(style.fontSize);
      const minContrast = fontSize >= 18 ? 3 : 4.5;
      if (contrast < minContrast) {
        problems.push({ text: ownText.substring(0, 60), contrast: contrast.toFixed(2), required: minContrast, fg: `rgb(${fg.r},${fg.g},${fg.b})`, bg: `rgb(${bg.r},${bg.g},${bg.b})`, fontSize });
      }
    }
    return problems;
  });
}
let contrastFailures = 0;
function report(label, issues) {
  if (issues.length) {
    contrastFailures += issues.length;
    console.log(`${label}: CONTRAST ISSUES (${issues.length}):`);
    issues.forEach((i) => console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`));
  } else console.log(`${label}: no contrast issues.`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });

(async () => {
  console.log('Pre-state:');
  for (const t of ['geneva_contacts', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  const preProfiles = await svcCount('profiles?select=id');

  // --- Seed contacts: A subscribed, B pending ---
  const admin = await svc('GET', `profiles?role=eq.admin&select=id&limit=1`);
  const adminId = admin[0].id;
  const [cA] = await svc('POST', 'geneva_contacts', [{
    first_name: 'TEST Mailchimp', last_name: 'Subscribed', email: TEST_EMAIL,
    professional_type: 'buyers_agent', region_city: 'Brisbane',
    original_source: 'linkedin', email_consent_status: 'subscribed', created_by: adminId,
  }]);
  const [cB] = await svc('POST', 'geneva_contacts', [{
    first_name: 'TEST Mailchimp', last_name: 'Pending', email: 'test.mailchimp.pending@example.com',
    professional_type: 'conveyancer', email_consent_status: 'pending', created_by: adminId,
  }]);
  console.log(`Seeded: A (subscribed)=${cA.id}, B (pending)=${cB.id}`);

  // --- 1. No auth → gateway blocks (JWT verification ON) ---
  const r1 = await callPush(null, cA.id);
  console.log('\n1. No-auth call:', r1.status, r1.status === 401 ? '(gateway blocked ✓)' : 'FAIL — should be 401!');

  // --- 2. Non-admin → 403 ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.nonadmin.mailchimp@example.com', password: 'TempNonAdmin123!',
      email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin3', user_type: 'buyers_agent' },
    }),
  });
  const tmpUser = await tmpRes.json();
  const nonAdminToken = await passwordGrant('test.nonadmin.mailchimp@example.com', 'TempNonAdmin123!');
  const r2 = await callPush(nonAdminToken, cA.id);
  console.log('2. Non-admin call:', r2.status, JSON.stringify(r2.json), r2.status === 403 ? '(refused ✓)' : 'FAIL!');

  // --- 3. Admin + PENDING contact → polite 409, nothing touched ---
  const adminToken = await passwordGrant(EMAIL, PASSWORD);
  const r3 = await callPush(adminToken, cB.id);
  console.log('3. Pending-contact call:', r3.status, JSON.stringify(r3.json),
    r3.status === 409 && r3.json?.reason === 'not_subscribed' ? '(politely refused ✓)' : 'FAIL!');
  const [bAfter] = await svc('GET', `geneva_contacts?id=eq.${cB.id}&select=mailchimp_status,mailchimp_synced_at`);
  const bActs = await svcCount(`geneva_activities?contact_id=eq.${cB.id}&event_type=eq.pushed_to_mailchimp&select=id`);
  console.log('   B untouched:', JSON.stringify(bAfter), 'push activities:', bActs,
    bAfter.mailchimp_status === null && bActs === 0 ? '✓' : 'FAIL!');

  // --- 4. UI: disabled button + note on pending; real button push on subscribed ---
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);

  // Pending contact: button disabled + quiet note
  await page.goto(`${baseUrl}/geneva/contacts/${cB.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const disabledState = await page.evaluate(() => ({
    disabled: document.querySelector('#qa-push-mailchimp')?.disabled ?? null,
    note: !!document.querySelector('[data-mailchimp-note]'),
  }));
  console.log('\n4a. Pending record — button disabled + note:', JSON.stringify(disabledState),
    disabledState.disabled === true && disabledState.note ? '✓' : 'FAIL!');
  await shot(page, '1-pending-disabled-desktop.png');
  report('Pending record (desktop)', await contrastAudit(page));

  // Subscribed contact: enabled → click → success
  await page.goto(`${baseUrl}/geneva/contacts/${cA.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const enabled = await page.evaluate(() => document.querySelector('#qa-push-mailchimp')?.disabled === false);
  console.log('4b. Subscribed record — button enabled:', enabled ? '✓' : 'FAIL!');
  await shot(page, '2-subscribed-enabled-desktop.png');
  await page.click('#qa-push-mailchimp');
  await sleep(4500);
  const chip = await page.evaluate(() => document.querySelector('[data-mailchimp-status]')?.textContent ?? null);
  console.log('4c. "In Mailchimp" chip after push:', JSON.stringify(chip), chip ? '✓' : 'FAIL!');
  await shot(page, '3-after-push-desktop.png');
  report('After push (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '4-after-push-mobile.png');
  report('After push (mobile)', await contrastAudit(page));
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? `Mobile: HORIZONTAL SCROLL ${JSON.stringify(h)}` : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });

  const [aAfter] = await svc('GET', `geneva_contacts?id=eq.${cA.id}&select=mailchimp_status,mailchimp_synced_at`);
  const aActs = await svc('GET', `geneva_activities?contact_id=eq.${cA.id}&event_type=eq.pushed_to_mailchimp&select=event_context,actor_user_id`);
  console.log('   DB after push:', JSON.stringify(aAfter),
    aAfter.mailchimp_status === 'synced' && aAfter.mailchimp_synced_at ? '✓' : 'FAIL!');
  console.log('   pushed_to_mailchimp activity:', aActs.length, JSON.stringify(aActs[0]?.event_context),
    aActs.length === 1 && aActs[0]?.actor_user_id === adminId ? '✓' : '(check)');

  // --- 5. Idempotent second push (API, same admin) ---
  const r5 = await callPush(adminToken, cA.id);
  const [aAfter2] = await svc('GET', `geneva_contacts?id=eq.${cA.id}&select=mailchimp_status,mailchimp_synced_at`);
  console.log('\n5. Second push:', r5.status, JSON.stringify(r5.json),
    r5.json?.ok === true && aAfter2.mailchimp_status === 'synced' ? '(idempotent upsert ✓)' : 'FAIL!');

  // --- Cleanup ---
  console.log('\nCleaning up test data...');
  await svc('DELETE', `geneva_contacts?id=in.(${cA.id},${cB.id})`);
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, {
    method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });
  console.log('Final counts:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  console.log(`  profiles: ${await svcCount('profiles?select=id')} (expect ${preProfiles})`);

  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — contact A: ${cA.id}, contact B: ${cB.id}, temp non-admin: ${tmpUser.id}`);
  console.log(`TEST EMAIL pushed to Mailchimp: ${TEST_EMAIL}`);
  console.log('>>> REMINDER: delete/archive this member from Mailchimp audience 606099323d (it is a real audience entry now).');
  await browser.close().catch(() => {});
  process.exit(0);
})();
