/**
 * Interview Funnel piece 4 verification — population-scoped dashboard +
 * the Interview Funnel widget.
 *
 * Proves with 3 throwaway outreach rows temporarily present:
 *   1. The WAITLIST funnel + growth + active-customers metrics DO NOT MOVE
 *      when outreach contacts exist (scoping works)
 *   2. Whole-book metrics (Total Contacts) DO include them — and say so
 *   3. The Interview Funnel widget shows per-stage counts in journey order
 *      + exits + total; stage rows deep-link to the outreach-filtered list
 *   4. Widget's calm ✦ empty state when no outreach exists
 *   5. Non-admin blocked; EXACT restoration (24/6/7/55, all waitlist,
 *      zero interview_stage set)
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
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const screenshotDir = './screenshots/geneva-ifunnel';
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
  const pre = {};
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    pre[t] = await svcCount(`${t}?select=id`);
  }
  console.log('Pre-state:', JSON.stringify(pre));
  const ADMIN = (await svc('GET', 'profiles?role=eq.admin&select=id&order=created_at.asc&limit=1'))[0].id;

  // --- Seed 3 throwaway outreach rows (demo domain; deleted at the end) ---
  const mk = async (n, stage) => (await svc('POST', 'geneva_contacts', [{
    first_name: `TEST IFunnel${n}`, email: `interview.widget.test${n}@geneva-demo.example`,
    professional_type: 'buyers_agent', contact_type: 'interview_outreach',
    interview_stage: stage, interview_stage_entered_at: new Date().toISOString(),
    email_consent_status: 'pending', created_by: ADMIN,
  }]))[0];
  const t1 = await mk(1, 'intro_email_sent');
  const t2 = await mk(2, 'interview_booked');
  const t3 = await mk(3, 'declined_kept_on_list');
  console.log('Seeded outreach test rows:', t1.id, t2.id, t3.id);

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

  // --- 1. Dashboard: waitlist metrics unmoved; whole-book metrics moved ---
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(3000);
  const body = await page.evaluate(() => document.body.innerText);
  const funnelNew = await page.evaluate(() =>
    document.querySelector('[data-funnel-stage="new"]')?.innerText ?? '');
  const totalCard = await page.evaluate(() =>
    [...document.querySelectorAll('[data-metric]')].find((e) => e.getAttribute('data-metric') === 'Total Contacts')?.innerText ?? '');
  console.log('\n1a. Waitlist funnel "New" row (expect 6 here — unmoved):', funnelNew.includes('6') ? '✓' : `FAIL: "${funnelNew}"`);
  console.log('1b. Total Contacts card includes outreach (expect 27):', totalCard.includes('27') ? '✓' : `FAIL: "${totalCard}"`);
  console.log('1c. Growth "This wk" unmoved by outreach adds (expect 10):',
    (await page.evaluate(() => document.body.innerText.match(/Up\s+(\d+)\s+vs/)?.[1] ?? '?')) === '10' ? '✓' : 'check');
  console.log('1d. Headings present:', ['The Waitlist Funnel', 'The Interview Funnel'].every((s) => body.toLowerCase().includes(s.toLowerCase())) ? '✓' : 'FAIL');

  // --- 2. Interview widget counts ---
  const widget = await page.evaluate(() => ({
    total: document.querySelector('[data-interview-total]')?.textContent?.trim(),
    intro: document.querySelector('[data-ifunnel-stage="intro_email_sent"]')?.innerText ?? '',
    booked: document.querySelector('[data-ifunnel-stage="interview_booked"]')?.innerText ?? '',
    toContact: document.querySelector('[data-ifunnel-stage="to_contact"]')?.innerText ?? '',
    keptExit: document.querySelector('[data-ifunnel-exit="declined_kept_on_list"]')?.innerText ?? '',
  }));
  console.log('\n2. Widget:', JSON.stringify(widget));
  console.log('   total=3:', widget.total === '3' ? '✓' : 'FAIL',
    '| intro=1:', /1\s*$/.test(widget.intro) ? '✓' : 'FAIL',
    '| booked=1:', /1\s*$/.test(widget.booked) ? '✓' : 'FAIL',
    '| to_contact=0 muted:', /0\s*$/.test(widget.toContact) ? '✓' : 'FAIL',
    '| kept exit=1:', /1\s*$/.test(widget.keptExit) ? '✓' : 'FAIL');
  await shot(page, '1-dashboard-both-funnels-desktop.png');
  report('Dashboard both funnels (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(1000);
  await shot(page, '2-dashboard-mobile.png');
  report('Dashboard (mobile)', await contrastAudit(page));
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? 'Mobile h-scroll: FAIL' : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 3. Stage row deep-link → outreach-filtered list ---
  await page.evaluate(() => document.querySelector('[data-ifunnel-stage="interview_booked"]')?.click());
  await sleep(2500);
  const rows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('\n3. Stage deep-link:', page.url().includes('type=interview_outreach') ? '✓ url' : `WRONG ${page.url()}`,
    '| rows:', rows, rows === 3 ? '✓ (3 outreach)' : 'check');

  // --- 4. Empty state after removing outreach rows ---
  await svc('DELETE', `geneva_contacts?id=in.(${t1.id},${t2.id},${t3.id})`);
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(3000);
  const emptyBody = await page.evaluate(() => document.body.innerText);
  console.log('\n4. Widget empty state:', emptyBody.includes('No interview outreach yet') ? '✓' : 'FAIL');
  await shot(page, '3-ifunnel-empty-desktop.png');
  report('Interview funnel empty (desktop)', await contrastAudit(page));

  // --- 5. Non-admin blocked ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.nonadmin.ifunnel@example.com', password: 'TempNonAdmin123!', email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin8', user_type: 'buyers_agent' } }),
  });
  const tmpUser = await tmpRes.json();
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const p2 = await ctx.newPage();
  await p2.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await p2.waitForSelector('#email', { timeout: 15000 });
  await p2.type('#email', 'test.nonadmin.ifunnel@example.com');
  await p2.type('#password', 'TempNonAdmin123!');
  await Promise.all([
    p2.click('button[type="submit"]'),
    p2.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
  await p2.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2000);
  const t2body = await p2.evaluate(() => document.body.innerText);
  console.log('\n5. Non-admin at /geneva:', t2body.includes('Access Denied') || !p2.url().includes('/geneva') ? 'blocked ✓' : 'FAIL!');
  await p2.close();
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, { method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` } });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });

  // --- Exact restoration ---
  console.log('\nPost-state (must equal pre):');
  let intact = true;
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    const n = await svcCount(`${t}?select=id`);
    if (n !== pre[t]) intact = false;
    console.log(`  ${t}: ${n} (was ${pre[t]}) ${n === pre[t] ? '✓' : 'FAIL!'}`);
  }
  console.log('  all waitlist:', await svcCount('geneva_contacts?select=id&contact_type=eq.waitlist'), '(expect 24)');
  console.log('  interview_stage set:', await svcCount('geneva_contacts?select=id&interview_stage=not.is.null'), '(expect 0)');
  console.log(`Demo intact: ${intact ? 'YES ✓' : 'NO — INVESTIGATE'}`);
  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — outreach rows: ${t1.id}, ${t2.id}, ${t3.id}; temp non-admin: ${tmpUser.id} (all deleted)`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
