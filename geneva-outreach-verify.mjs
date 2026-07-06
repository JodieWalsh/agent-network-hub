/**
 * Interview Funnel piece 2 verification — label UI + compliance guardrail.
 *
 * Proves, against the deployed geneva-mailchimp-push + live UI:
 *   1. Outreach contact, consent flipped to 'subscribed' WITHOUT recorded
 *      evidence (bare dropdown-flip simulation) → push REFUSED
 *      (409 consent_not_recorded), nothing touched
 *   2. Outreach contact created via the REAL form (type picker + gentle
 *      note + required evidence field) → consent_changed activity written
 *      → push SUCCEEDS
 *   3. Waitlist contacts completely unaffected (subscribed waitlist pushes
 *      with no consent activity, as before)
 *   4. "Outreach" chip renders on record + list; Type filter separates the
 *      populations; screenshots desktop + 375px; zero contrast issues
 *   5. Non-admin blocked; 24 demo contacts untouched
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

// O1 never reaches Mailchimp (refused first), so a fake email is fine there.
// O2 + W actually push, so they need deliverable addresses (Jodie deletes
// them from audience 606099323d afterwards).
const O1_EMAIL = 'test.outreach.noconsent@type-test.example';
const O2_EMAIL = 'jlralph+geneva-outreach-test@gmail.com';
const W_EMAIL = 'jlralph+geneva-waitlist-check@gmail.com';

const screenshotDir = './screenshots/geneva-outreach';
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
async function adminToken() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  return (await r.json()).access_token;
}
async function push(token, contactId) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/geneva-mailchimp-push`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contactId }),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
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
  const preTotal = await svcCount('geneva_contacts?select=id');
  console.log(`Pre-state: ${preTotal} contacts (must return to ${preTotal}).`);
  const ADMIN = (await svc('GET', 'profiles?role=eq.admin&select=id&order=created_at.asc&limit=1'))[0].id;
  const token = await adminToken();

  // --- 1. Outreach + bare dropdown-flip 'subscribed' (NO evidence) → refused ---
  const [O1] = await svc('POST', 'geneva_contacts', [{
    first_name: 'TEST OutreachNoConsent', email: O1_EMAIL, professional_type: 'buyers_agent',
    contact_type: 'interview_outreach', email_consent_status: 'subscribed', created_by: ADMIN,
  }]);
  const r1 = await push(token, O1.id);
  const [o1After] = await svc('GET', `geneva_contacts?id=eq.${O1.id}&select=mailchimp_status`);
  console.log('\n1. Outreach WITHOUT recorded consent:', r1.status, JSON.stringify(r1.json),
    r1.status === 409 && r1.json?.reason === 'consent_not_recorded' && o1After.mailchimp_status === null
      ? '(refused, untouched ✓)' : 'FAIL!');

  // --- 3 (early). Waitlist unaffected: subscribed waitlist, no consent activity → pushes ---
  const [W] = await svc('POST', 'geneva_contacts', [{
    first_name: 'TEST WaitlistCheck', email: W_EMAIL, professional_type: 'buyers_agent',
    contact_type: 'waitlist', email_consent_status: 'subscribed', created_by: ADMIN,
  }]);
  const rW = await push(token, W.id);
  console.log('2. Waitlist (no consent activity needed):', rW.status, JSON.stringify(rW.json),
    rW.json?.ok === true ? '(unchanged behaviour ✓)' : 'FAIL!');

  // --- 2. Outreach WITH consent via the REAL form ---
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

  await page.goto(`${baseUrl}/geneva/contacts/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.type('#gc_first_name', 'TEST OutreachConsent');
  await page.type('#gc_email', O2_EMAIL);
  await page.select('#gc_contact_type', 'interview_outreach');
  await sleep(400);
  const noteShown = await page.evaluate(() => !!document.querySelector('[data-outreach-note]'));
  console.log('\n3a. Outreach note shown on picker:', noteShown ? '✓' : 'FAIL');
  await page.select('#gc_consent', 'subscribed');
  await sleep(400);
  const evidenceShown = await page.evaluate(() => !!document.querySelector('#gc_consent_evidence'));
  console.log('3b. Evidence field appears (outreach + subscribed):', evidenceShown ? '✓' : 'FAIL');
  await shot(page, '1-form-outreach-evidence-desktop.png');
  report('Form with evidence field (desktop)', await contrastAudit(page));
  // Try saving WITHOUT evidence → inline error
  await page.click('#gc_save');
  await sleep(800);
  const evErr = await page.evaluate(() => document.querySelector('[data-field-error="consent_evidence"]')?.textContent ?? null);
  console.log('3c. Save blocked without evidence:', evErr ? `✓ ("${evErr.slice(0, 40)}…")` : 'FAIL');
  await page.type('#gc_consent_evidence', 'Replied yes to our intro email, 7 Jul — asked to hear about launch.');
  await page.click('#gc_save');
  await sleep(3000);

  const [O2] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(O2_EMAIL)}&select=id,contact_type,email_consent_status`);
  const consentActs = await svc('GET', `geneva_activities?contact_id=eq.${O2.id}&event_type=eq.consent_changed&select=event_context`);
  console.log('3d. Saved:', JSON.stringify(O2), '| consent_changed activity:', consentActs.length,
    JSON.stringify(consentActs[0]?.event_context),
    O2.contact_type === 'interview_outreach' && consentActs.length === 1 && consentActs[0]?.event_context?.evidence ? '✓' : 'FAIL');

  // Record page: Outreach chip + push succeeds
  await page.goto(`${baseUrl}/geneva/contacts/${O2.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const chip = await page.evaluate(() => !!document.querySelector('[data-outreach-chip]'));
  console.log('3e. Outreach chip on record:', chip ? '✓' : 'FAIL');
  await shot(page, '2-record-outreach-desktop.png');
  report('Record with Outreach chip (desktop)', await contrastAudit(page));
  await page.click('#qa-push-mailchimp');
  await sleep(4500);
  const [o2After] = await svc('GET', `geneva_contacts?id=eq.${O2.id}&select=mailchimp_status,mailchimp_synced_at`);
  console.log('3f. Push WITH recorded consent:', JSON.stringify(o2After),
    o2After.mailchimp_status === 'synced' ? '✓' : 'FAIL');
  await shot(page, '3-record-after-push-desktop.png');

  // --- 4. Type filter separates populations ---
  await page.goto(`${baseUrl}/geneva/contacts`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const typeChips = await page.evaluate(() => !!document.querySelector('#gtype-interview_outreach'));
  console.log('\n4a. Type filter row shown (outreach exists):', typeChips ? '✓' : 'FAIL');
  await page.click('#gtype-interview_outreach');
  await sleep(800);
  const outreachRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('4b. Outreach filter rows:', outreachRows, outreachRows === 2 ? '✓ (O1 + O2)' : 'check');
  await shot(page, '4-list-outreach-filter-desktop.png');
  report('List filtered to Outreach (desktop)', await contrastAudit(page));
  await page.click('#gtype-waitlist');
  await sleep(800);
  const waitlistRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('4c. Waitlist filter rows:', waitlistRows, waitlistRows === preTotal + 1 ? `✓ (24 demo + W)` : 'check');
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '5-list-filters-mobile.png');
  report('List filters (mobile)', await contrastAudit(page));
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? 'Mobile h-scroll: FAIL' : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });

  // --- 5. Non-admin blocked (quick) ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.nonadmin.outreach@example.com', password: 'TempNonAdmin123!', email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin6', user_type: 'buyers_agent' } }),
  });
  const tmpUser = await tmpRes.json();
  const naTok = (await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.nonadmin.outreach@example.com', password: 'TempNonAdmin123!' }),
  })).json()).access_token;
  const rNA = await push(naTok, O2.id);
  console.log('\n5. Non-admin push attempt:', rNA.status, rNA.status === 403 ? '(blocked ✓)' : 'FAIL!');

  // --- Cleanup ---
  console.log('\nCleaning up...');
  await svc('DELETE', `geneva_contacts?id=in.(${O1.id},${O2.id},${W.id})`);
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, { method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` } });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });
  const postTotal = await svcCount('geneva_contacts?select=id');
  console.log(`Post-state: ${postTotal} contacts ${postTotal === preTotal ? '(demo intact ✓)' : 'MISMATCH!'}`);

  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — O1 (refused): ${O1.id}, O2 (pushed): ${O2.id}, W (waitlist pushed): ${W.id}, temp non-admin: ${tmpUser.id}`);
  console.log(`>>> Jodie: delete from Mailchimp audience 606099323d: ${O2_EMAIL} and ${W_EMAIL}`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
