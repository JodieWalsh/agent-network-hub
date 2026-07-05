/**
 * Geneva Phase 1 UI verification — contacts list + add/edit form.
 *
 * Drives the real UI as the seeded admin:
 *   1. Sidebar shows the admin-only "Geneva" item; empty state renders
 *   2. Add Contact form (desktop + 375px mobile, contrast audits)
 *   3. Create ONE test contact → DB row + 'contact_created' activity
 *   4. Duplicate email (different case) → friendly inline message, no row
 *   5. Edit: stage change → 'stage_changed' activity
 *   6. NON-ADMIN: temp auth user created via admin API → no Geneva nav item,
 *      /geneva/contacts shows Access Denied → temp user deleted
 * Cleanup: geneva_contacts + geneva_activities back to 0 rows.
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const screenshotDir = './screenshots/geneva-phase1';
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

/* Same WCAG text-contrast audit as the other verify scripts */
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
async function noHScroll(page, label) {
  const h = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth,
  }));
  console.log(h.sw > h.cw || h.bw > h.cw ? `${label}: HORIZONTAL SCROLL DETECTED ${JSON.stringify(h)}` : `${label}: no horizontal scrolling.`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });

async function login(page, email, password) {
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', email);
  await page.type('#password', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
}

async function gotoStable(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    if (page.url().includes(new URL(url).pathname)) return;
    console.log(`  (attempt ${attempt}: landed on ${page.url()}, retrying)`);
  }
}

const TEST_EMAIL = 'test.geneva.prospect@example.com';

(async () => {
  // --- Pre-state ---
  console.log('Pre-state:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  const preProfiles = await svcCount('profiles?select=id');
  console.log(`  profiles: ${preProfiles}`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --- Login as admin ---
  console.log('\nLogging in as admin...');
  await login(page, EMAIL, PASSWORD);
  console.log('Post-login URL:', page.url());

  // --- 1. Sidebar has Geneva (admin) + empty state ---
  await gotoStable(page, `${baseUrl}/geneva/contacts`);
  const adminNav = await page.evaluate(() => document.body.innerText.includes('Geneva'));
  console.log('\nAdmin sees "Geneva" nav item:', adminNav ? '✓' : 'MISSING!');
  await shot(page, '1-empty-desktop.png');
  report('Empty state (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '2-empty-mobile.png');
  report('Empty state (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Empty state (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 2. Add Contact form ---
  await page.click('#empty_add_contact_btn');
  await sleep(2000);
  await shot(page, '3-add-form-desktop.png');
  report('Add form (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '4-add-form-mobile.png');
  report('Add form (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Add form (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 3. Create the test contact via the form ---
  await page.type('#gc_first_name', 'TEST Avery');
  await page.type('#gc_last_name', 'Prospect');
  await page.type('#gc_email', TEST_EMAIL);
  await page.type('#gc_phone', '0400 000 000');
  await page.type('#gc_company', 'Prospect Property Co');
  await page.select('#gc_professional_type', 'real_estate_agent');
  await page.type('#gc_region_city', 'Brisbane');
  await page.select('#gc_source', 'linkedin');
  await page.type('#gc_source_detail', 'Replied to launch announcement post');
  await page.select('#gc_consent', 'subscribed');
  await page.type('#gc_notes', 'TEST contact — created by geneva-verify.mjs');
  await page.click('#gc_save');
  await sleep(3000);

  const [contact] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(TEST_EMAIL)}&select=*`);
  console.log('\nDB contact row:', contact
    ? `id=${contact.id}, type=${contact.professional_type}, source=${contact.original_source}, consent=${contact.email_consent_status}, created_by=${contact.created_by} ✓`
    : 'MISSING!');
  const createdActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.contact_created&select=event_context,actor_user_id`);
  console.log('contact_created activity:', createdActs.length, JSON.stringify(createdActs[0]?.event_context),
    createdActs[0]?.event_context?.professional_type === 'real_estate_agent' && createdActs[0]?.event_context?.original_source === 'linkedin' ? '✓' : '(MISMATCH!)');

  // List shows the contact
  await shot(page, '5-list-with-contact-desktop.png');
  report('List with contact (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '6-list-with-contact-mobile.png');
  report('List with contact (mobile)', await contrastAudit(page));
  await noHScroll(page, 'List (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 4. Duplicate email, different case → friendly inline message ---
  await gotoStable(page, `${baseUrl}/geneva/contacts/new`);
  await page.type('#gc_first_name', 'TEST Duplicate');
  await page.type('#gc_email', 'TEST.GENEVA.PROSPECT@EXAMPLE.COM');
  await page.click('#gc_save');
  await sleep(2500);
  const dupMsg = await page.evaluate(() => document.querySelector('[data-field-error="email"]')?.textContent ?? null);
  console.log('\nDuplicate message shown:', JSON.stringify(dupMsg), dupMsg?.includes('already exists') ? '✓' : '(MISSING!)');
  await shot(page, '7-duplicate-message-desktop.png');
  report('Duplicate message (desktop)', await contrastAudit(page));
  const rowCount = await svcCount('geneva_contacts?select=id');
  console.log('geneva_contacts rows after duplicate attempt:', rowCount, rowCount === 1 ? '(no row created ✓)' : '(MISMATCH!)');

  // --- 5. Edit: change stage → stage_changed activity ---
  await gotoStable(page, `${baseUrl}/geneva/contacts/${contact.id}/edit`);
  await page.select('#gc_lifecycle_stage', 'engaged');
  await page.click('#gc_save');
  await sleep(3000);
  const [after] = await svc('GET', `geneva_contacts?id=eq.${contact.id}&select=lifecycle_stage`);
  const stageActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.stage_changed&select=event_context`);
  console.log('\nAfter edit: stage =', after.lifecycle_stage, after.lifecycle_stage === 'engaged' ? '✓' : '(MISMATCH!)');
  console.log('stage_changed activity:', stageActs.length, JSON.stringify(stageActs[0]?.event_context),
    stageActs[0]?.event_context?.to === 'engaged' ? '✓' : '(MISMATCH!)');

  // --- 6. NON-ADMIN cannot see or reach Geneva ---
  console.log('\nCreating temp non-admin auth user...');
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.nonadmin.geneva@example.com',
      password: 'TempNonAdmin123!',
      email_confirm: true,
      user_metadata: { full_name: 'TEST NonAdmin', user_type: 'buyers_agent' },
    }),
  });
  const tmpUser = await tmpRes.json();
  console.log('Temp user:', tmpRes.status, tmpUser.id);

  // Isolated incognito context — the main context is already logged in as
  // the admin, so /auth would just redirect there.
  const ctx = await (browser.createBrowserContext
    ? browser.createBrowserContext()
    : browser.createIncognitoBrowserContext());
  const page2 = await ctx.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await login(page2, 'test.nonadmin.geneva@example.com', 'TempNonAdmin123!');
  const tmpProfile = await svc('GET', `profiles?id=eq.${tmpUser.id}&select=role`);
  console.log('Temp user role:', JSON.stringify(tmpProfile[0]));
  const navHasGeneva = await page2.evaluate(() => {
    const links = [...document.querySelectorAll('aside a')];
    return links.some((a) => a.textContent.trim() === 'Geneva');
  });
  console.log('Non-admin sees Geneva nav item:', navHasGeneva ? 'VISIBLE — FAIL!' : 'hidden ✓');
  await page2.goto(`${baseUrl}/geneva/contacts`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const blocked = await page2.evaluate(() => document.body.innerText);
  const denied = blocked.includes('Access Denied');
  const redirected = !page2.url().includes('/geneva');
  console.log('Non-admin at /geneva/contacts:', denied ? 'Access Denied page ✓' : redirected ? `redirected to ${page2.url()} ✓` : 'REACHED GENEVA — FAIL!');
  const leakedContact = blocked.includes('TEST Avery');
  console.log('Non-admin can see contact data:', leakedContact ? 'LEAKED — FAIL!' : 'no ✓');
  await shot(page2, '8-nonadmin-blocked.png');
  await page2.close();

  // --- Cleanup ---
  console.log('\nCleaning up test data...');
  await svc('DELETE', `geneva_contacts?id=eq.${contact.id}`); // cascades activities
  const delUser = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, {
    method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
  console.log('Temp auth user deleted:', delUser.status);
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });

  console.log('\nFinal counts:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  console.log(`  profiles: ${await svcCount('profiles?select=id')} (expect ${preProfiles})`);

  await browser.close().catch(() => {});
  console.log(`\nTotal contrast failures across all audits: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — geneva contact: ${contact.id}, temp non-admin auth user: ${tmpUser.id}`);
  process.exit(0);
})();
