/**
 * Geneva Phase 4 verification — command-centre dashboard + saved-view chips.
 *
 * Runs against the LIVE DEMO DATA and NEVER modifies it (Dani review set):
 *   1. Dashboard renders with funnel, metrics, growth, channels, types,
 *      attention list — numbers cross-checked against the DB
 *   2. Metric card click deep-links to the filtered contacts list
 *   3. Saved-view chips filter the list with live counts (checked vs DB)
 *   4. ?empty=1 design preview shows the ✦ zero-data state (no data touched)
 *   5. Non-admin blocked from /geneva and /geneva/contacts
 *   6. Post-state: all geneva_* counts + contacts max(updated_at) unchanged
 * Desktop + 375px mobile screenshots, WCAG contrast audits throughout.
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

const screenshotDir = './screenshots/geneva-dashboard';
fs.mkdirSync(screenshotDir, { recursive: true });

const svcHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}` };
async function svcCount(q) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
    method: 'HEAD', headers: { ...svcHeaders, Prefer: 'count=exact' },
  });
  const t = res.headers.get('content-range')?.split('/')[1];
  return t && t !== '*' ? parseInt(t, 10) : -1;
}
async function svcGet(q) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: svcHeaders });
  return res.json();
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
const shot = (page, name, full = true) => page.screenshot({ path: path.join(screenshotDir, name), fullPage: full });

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

(async () => {
  // --- Pre-state snapshot (demo data must remain EXACTLY as-is) ---
  const pre = {};
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    pre[t] = await svcCount(`${t}?select=id`);
  }
  const [preMax] = await svcGet('geneva_contacts?select=updated_at&order=updated_at.desc&limit=1');
  console.log('Pre-state:', JSON.stringify(pre), 'max updated_at:', preMax?.updated_at);

  // DB truths to cross-check the dashboard against
  const dbSubscribed = await svcCount(`geneva_contacts?select=id&email_consent_status=eq.subscribed`);
  const dbInactive = await svcCount(`geneva_contacts?select=id&lifecycle_stage=eq.inactive`);
  const dbActiveCust = await svcCount(`geneva_contacts?select=id&lifecycle_stage=eq.active_customer`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\nLogging in as admin...');
  await login(page, EMAIL, PASSWORD);

  // --- 1. Dashboard (populated) ---
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(3000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\nDashboard sections present:');
  for (const s of ['Command Centre', 'The Funnel', 'Growth Signal', 'Channel Performance', 'By Professional Type', 'Needs Attention Today', 'Biggest drop-off']) {
    console.log(`  "${s}":`, text.includes(s) ? '✓' : 'MISSING!');
  }
  const metricVals = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-metric]')].map((el) => [
      el.getAttribute('data-metric'),
      parseInt(el.querySelector('p')?.nextElementSibling?.textContent ?? el.textContent.match(/\d+/)?.[0] ?? '-1', 10),
    ]))
  );
  const metricText = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-metric]')].map((el) => [
      el.getAttribute('data-metric'), el.innerText,
    ]))
  );
  console.log('\nMetric cards vs DB:');
  console.log('  Total Contacts:', metricText['Total Contacts']?.includes(String(pre.geneva_contacts)) ? `✓ (${pre.geneva_contacts})` : `MISMATCH: ${JSON.stringify(metricText['Total Contacts'])}`);
  console.log('  Subscribed:', metricText['Subscribed']?.includes(String(dbSubscribed)) ? `✓ (${dbSubscribed})` : `MISMATCH`);
  console.log('  Active Customers:', metricText['Active Customers']?.includes(String(dbActiveCust)) ? `✓ (${dbActiveCust})` : `MISMATCH`);
  const funnelStages = await page.evaluate(() => [...document.querySelectorAll('[data-funnel-stage]')].map((e) => e.getAttribute('data-funnel-stage')));
  console.log('  Funnel stages rendered:', funnelStages.length === 6 ? `✓ (6)` : `MISMATCH: ${JSON.stringify(funnelStages)}`);
  console.log('  Inactive shown separately:', text.includes(`${dbInactive} inactive`) ? `✓ (${dbInactive})` : 'check wording');
  const attentionCount = await page.evaluate(() => document.querySelectorAll('[data-attention]').length);
  console.log('  Attention list rows:', attentionCount, attentionCount > 0 ? '✓' : '(none — check tasks)');

  await shot(page, '1-dashboard-desktop.png');
  await shot(page, '1b-dashboard-viewport.png', false);
  report('Dashboard (desktop)', await contrastAudit(page));

  await page.setViewport({ width: 375, height: 812 });
  await sleep(1000);
  await shot(page, '2-dashboard-mobile.png');
  report('Dashboard (mobile)', await contrastAudit(page));
  const h1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h1.sw > h1.cw ? `Mobile: HORIZONTAL SCROLL ${JSON.stringify(h1)}` : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 2. Metric card deep-link → filtered list ---
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('[data-metric]')].find((e) => e.getAttribute('data-metric') === 'Subscribed')?.click();
  });
  await sleep(2500);
  const urlAfter = page.url();
  const chipActive = await page.evaluate(() => document.querySelector('#gview-subscribed')?.getAttribute('aria-pressed'));
  const rowCount = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('\nMetric card deep-link:', urlAfter.includes('view=subscribed') ? '✓ url' : `WRONG URL ${urlAfter}`,
    '| chip active:', chipActive === 'true' ? '✓' : 'FAIL', '| rows:', rowCount, rowCount === dbSubscribed ? `✓ (= DB ${dbSubscribed})` : `MISMATCH (DB ${dbSubscribed})`);

  // --- 3. Chips filter the list ---
  await shot(page, '3-chips-subscribed-desktop.png');
  report('Chips: subscribed view (desktop)', await contrastAudit(page));
  await page.click('#gview-inactive');
  await sleep(800);
  const inactiveRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('Inactive chip:', inactiveRows === dbInactive ? `✓ rows = DB (${dbInactive})` : `MISMATCH: ${inactiveRows} vs ${dbInactive}`);
  await page.click('#gview-needs_followup');
  await sleep(800);
  const fuRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('Needs-follow-up chip rows:', fuRows, fuRows > 0 ? '✓' : '(none?)');
  await shot(page, '4-chips-followup-desktop.png');
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '5-chips-mobile.png');
  report('Chips (mobile)', await contrastAudit(page));
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 4. ✦ zero-data preview (?empty=1 — data untouched) ---
  await page.goto(`${baseUrl}/geneva?empty=1`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const emptyText = await page.evaluate(() => document.body.innerText);
  console.log('\nEmpty-state preview:', emptyText.includes('Your command centre awaits') ? '✓' : 'MISSING!');
  await shot(page, '6-dashboard-empty-desktop.png');
  report('Empty state (desktop)', await contrastAudit(page));

  // --- 5. Non-admin blocked ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...svcHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.nonadmin.dashboard@example.com', password: 'TempNonAdmin123!',
      email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin4', user_type: 'buyers_agent' },
    }),
  });
  const tmpUser = await tmpRes.json();
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const page2 = await ctx.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await login(page2, 'test.nonadmin.dashboard@example.com', 'TempNonAdmin123!');
  for (const route of ['/geneva', '/geneva/contacts']) {
    await page2.goto(baseUrl + route, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(2000);
    const t = await page2.evaluate(() => document.body.innerText);
    const blocked = t.includes('Access Denied') || !page2.url().includes('/geneva');
    console.log(`Non-admin at ${route}:`, blocked ? 'blocked ✓' : 'REACHED — FAIL!',
      t.includes('Pemberton') ? '(DATA LEAKED — FAIL!)' : '');
  }
  await page2.close();
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: { ...svcHeaders, 'Content-Type': 'application/json' } });

  // --- 6. Demo data untouched ---
  console.log('\nPost-state (must equal pre-state):');
  let intact = true;
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    const n = await svcCount(`${t}?select=id`);
    if (n !== pre[t]) intact = false;
    console.log(`  ${t}: ${n} (was ${pre[t]}) ${n === pre[t] ? '✓' : 'CHANGED — FAIL!'}`);
  }
  const [postMax] = await svcGet('geneva_contacts?select=updated_at&order=updated_at.desc&limit=1');
  console.log(`  contacts max updated_at: ${postMax?.updated_at === preMax?.updated_at ? 'unchanged ✓' : 'CHANGED — FAIL!'}`);
  console.log(`\nDemo data intact: ${intact ? 'YES ✓' : 'NO — INVESTIGATE'}`);
  console.log(`Temp non-admin (deleted): ${tmpUser.id}`);
  console.log(`Total contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  await browser.close().catch(() => {});
  process.exit(0);
})();
