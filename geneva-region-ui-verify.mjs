/**
 * Region filter + Demand-by-Region widget verification (the two small
 * launch-region pieces). Runs against the live demo data, read-only:
 *   1. Dashboard widget renders with per-region counts cross-checked to the
 *      DB + the "No region set" line; bars deep-link to the filtered list
 *   2. Contacts-list region chips filter correctly, combine with saved
 *      views, and show live counts; empty combo → calm ✦ + Clear filters
 *   3. Desktop + 375px mobile screenshots, zero contrast issues
 *   4. Non-admin still blocked; demo data untouched (24 contacts)
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

const screenshotDir = './screenshots/geneva-region-ui';
fs.mkdirSync(screenshotDir, { recursive: true });

const svcHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}` };
async function svcCount(q) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
    method: 'HEAD', headers: { ...svcHeaders, Prefer: 'count=exact' },
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
  const preTotal = await svcCount('geneva_contacts?select=id');
  console.log(`Pre-state: ${preTotal} contacts (must stay ${preTotal}).`);
  // DB truths per region
  const db = {};
  for (const t of ['greater_sydney', 'greater_melbourne', 'seq', 'greater_perth', 'uk', 'us', 'other']) {
    db[t] = await svcCount(`geneva_contacts?select=id&launch_regions=cs.{${t}}`);
  }
  db.noRegion = await svcCount('geneva_contacts?select=id&launch_regions=is.null');
  const dbProspectsUk = await svcCount('geneva_contacts?select=id&lifecycle_stage=in.(new,engaged,qualified)&launch_regions=cs.{uk}');
  console.log('DB region counts:', JSON.stringify(db), '| prospects∩uk:', dbProspectsUk);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Login
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);

  // --- 1. Dashboard widget ---
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(3000);
  const widget = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-region-demand]')].map((el) => [
      el.getAttribute('data-region-demand'),
      parseInt(el.innerText.match(/(\d+)\s*$/)?.[1] ?? '-1', 10),
    ])));
  console.log('\nWidget bars:', JSON.stringify(widget));
  let widgetOk = true;
  for (const [t, n] of Object.entries(widget)) if (db[t] !== n) widgetOk = false;
  console.log('Widget counts match DB:', widgetOk ? '✓' : 'MISMATCH!');
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(`"No region set: ${db.noRegion}" shown:`, bodyText.includes(`No region set: ${db.noRegion}`) ? '✓' : 'MISSING!');
  // Sorted desc?
  const order = Object.values(widget);
  console.log('Bars sorted highest-first:', order.every((v, i) => i === 0 || order[i - 1] >= v) ? '✓' : 'FAIL');
  await page.evaluate(() => [...document.querySelectorAll('h2')].find((h) => h.textContent.includes('DEMAND') || h.textContent.toLowerCase().includes('demand'))?.scrollIntoView({ block: 'center' }));
  await sleep(600);
  await shot(page, '1-demand-widget-desktop.png');
  report('Demand widget (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '2-dashboard-mobile.png');
  report('Dashboard (mobile)', await contrastAudit(page));
  const h1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h1.sw > h1.cw ? `Mobile h-scroll: FAIL ${JSON.stringify(h1)}` : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 2. Bar deep-link → filtered list ---
  await page.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('[data-region-demand]')].find((e) => e.getAttribute('data-region-demand') === 'uk')?.click();
  });
  await sleep(2500);
  const url = page.url();
  const chipActive = await page.evaluate(() => document.querySelector('#gregion-uk')?.getAttribute('aria-pressed'));
  const rows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('\nBar deep-link:', url.includes('region=uk') ? '✓ url' : `WRONG ${url}`,
    '| chip active:', chipActive === 'true' ? '✓' : 'FAIL',
    '| rows:', rows, rows === db.uk ? `✓ (= DB ${db.uk})` : `MISMATCH (DB ${db.uk})`);
  await shot(page, '3-list-region-uk-desktop.png');
  report('List filtered by UK (desktop)', await contrastAudit(page));

  // --- 3. Chips: single region + combined with saved view + empty combo ---
  await page.click('#gregion-greater_sydney');
  await sleep(800);
  const sydRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('Greater Sydney chip:', sydRows === db.greater_sydney ? `✓ rows = DB (${db.greater_sydney})` : `MISMATCH ${sydRows} vs ${db.greater_sydney}`);
  // Combine: Prospects + UK
  await page.click('#gview-prospects');
  await sleep(500);
  await page.click('#gregion-uk');
  await sleep(800);
  const comboRows = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('Prospects + UK combo:', comboRows === dbProspectsUk ? `✓ rows = DB (${dbProspectsUk})` : `MISMATCH ${comboRows} vs ${dbProspectsUk}`);
  await shot(page, '4-combo-prospects-uk-desktop.png');
  // Empty combo: Active customers + UK (Theo is 'other' → should be empty)
  await page.click('#gview-active_customers');
  await sleep(800);
  const emptyState = await page.evaluate(() => document.body.innerText.includes('No one here works in United Kingdom'));
  console.log('Empty combo (Active customers + UK):', emptyState ? '✓ calm empty state' : 'MISSING!');
  await shot(page, '5-empty-combo-desktop.png');
  report('Empty combo (desktop)', await contrastAudit(page));
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Clear filters')?.click());
  await sleep(800);
  const afterClear = await page.evaluate(() => document.querySelectorAll('[data-contact-row]').length);
  console.log('Clear filters:', afterClear === preTotal ? `✓ (all ${preTotal} back)` : `MISMATCH ${afterClear}`);
  // Mobile chips
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '6-list-chips-mobile.png');
  report('List chips (mobile)', await contrastAudit(page));
  const h2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h2.sw > h2.cw ? `Mobile h-scroll: FAIL` : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });

  // --- 4. Non-admin blocked ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: { ...svcHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.nonadmin.regions@example.com', password: 'TempNonAdmin123!', email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin5', user_type: 'buyers_agent' } }),
  });
  const tmpUser = await tmpRes.json();
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const p2 = await ctx.newPage();
  await p2.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await p2.waitForSelector('#email', { timeout: 15000 });
  await p2.type('#email', 'test.nonadmin.regions@example.com');
  await p2.type('#password', 'TempNonAdmin123!');
  await Promise.all([
    p2.click('button[type="submit"]'),
    p2.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
  await p2.goto(`${baseUrl}/geneva`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2000);
  const t2 = await p2.evaluate(() => document.body.innerText);
  console.log('\nNon-admin at /geneva:', t2.includes('Access Denied') || !p2.url().includes('/geneva') ? 'blocked ✓' : 'REACHED — FAIL!');
  await p2.close();
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: { ...svcHeaders, 'Content-Type': 'application/json' } });

  const postTotal = await svcCount('geneva_contacts?select=id');
  console.log(`\nPost-state: ${postTotal} contacts ${postTotal === preTotal ? '(untouched ✓)' : 'CHANGED — FAIL!'}`);
  console.log(`Total contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  await browser.close().catch(() => {});
  process.exit(0);
})();
