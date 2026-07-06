/**
 * Launch-regions verification — waitlist Stage 1 capture.
 *
 * Against the DEPLOYED intake + live UI, demo data untouched (24 contacts):
 *   1. API: valid tokens stored exactly; garbage/dupes/non-strings dropped;
 *      over-cap sliced; absent → null
 *   2. DB belt: direct insert with an unknown token rejected by the CHECK
 *   3. UI: chips render + toggle on the waitlist form; full submit stores
 *      tokens; wraps cleanly at 375px AND at a large-font simulation
 *      (root font-size 24px) with no horizontal overflow
 *   4. Geneva record shows the launch-region chips
 * Cleanup by exact test emails; demo contacts stay at 24.
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

const FN_URL = `${SUPABASE_URL}/functions/v1/geneva-lead-intake`;
const T_EMAILS = {
  valid: 'test.regions.valid@region-test.example',
  garbage: 'test.regions.garbage@region-test.example',
  absent: 'test.regions.absent@region-test.example',
  ui: 'test.regions.ui@region-test.example',
};

const screenshotDir = './screenshots/geneva-regions';
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
async function intake(body) {
  const res = await fetch(FN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function getByEmail(email) {
  const rows = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(email)}&select=id,launch_regions,email_consent_status`);
  return rows[0] ?? null;
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

(async () => {
  const preDemo = await svcCount('geneva_contacts?select=id&email=like.*%40geneva-demo.example');
  const preTotal = await svcCount('geneva_contacts?select=id');
  console.log(`Pre-state: ${preTotal} contacts (${preDemo} demo — must stay ${preDemo}).`);

  // --- 1. API behaviour ---
  const r1 = await intake({
    first_name: 'TEST RegionsValid', email: T_EMAILS.valid,
    launch_regions: ['greater_sydney', 'uk'], consent_opt_in: true,
  });
  const c1 = await getByEmail(T_EMAILS.valid);
  console.log('\n1a. Valid tokens:', r1.status, JSON.stringify(c1?.launch_regions),
    JSON.stringify(c1?.launch_regions) === '["greater_sydney","uk"]' ? '✓' : 'FAIL');

  const r2 = await intake({
    first_name: 'TEST RegionsGarbage', email: T_EMAILS.garbage,
    launch_regions: ['greater_sydney', 'hacker_region', 123, null, 'uk', 'greater_sydney',
      'seq', 'us', 'greater_perth', 'greater_melbourne', 'other', 'uk', 'DROP TABLE'],
  });
  const c2 = await getByEmail(T_EMAILS.garbage);
  const c2ok = Array.isArray(c2?.launch_regions) && c2.launch_regions.length === 7 &&
    !c2.launch_regions.includes('hacker_region') && new Set(c2.launch_regions).size === 7;
  console.log('1b. Garbage/dupes/over-cap:', r2.status, JSON.stringify(c2?.launch_regions),
    c2ok ? '✓ (whitelisted, deduped, capped at 7)' : 'FAIL');

  const r3 = await intake({ first_name: 'TEST RegionsAbsent', email: T_EMAILS.absent });
  const c3 = await getByEmail(T_EMAILS.absent);
  console.log('1c. Absent:', r3.status, JSON.stringify(c3?.launch_regions),
    c3?.launch_regions === null ? '✓ (null)' : 'FAIL');

  // --- 2. DB CHECK belt (unknown token rejected even at service level) ---
  const bad = await fetch(`${SUPABASE_URL}/rest/v1/geneva_contacts`, {
    method: 'POST', headers: svcHeaders,
    body: JSON.stringify({ first_name: 'X', email: 'belt@region-test.example', launch_regions: ['narnia'] }),
  });
  console.log('2. DB CHECK vs unknown token:', bad.status, bad.status >= 400 ? '(rejected ✓)' : 'ACCEPTED — FAIL!');

  // --- 3. UI: chips on the waitlist form ---
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2500);
  const chipCount = await page.evaluate(() => document.querySelectorAll('[data-region-chip]').length);
  console.log('\n3a. Region chips rendered:', chipCount, chipCount === 7 ? '✓' : 'FAIL');
  await page.click('[data-region-chip="greater_sydney"]');
  await page.click('[data-region-chip="uk"]');
  const pressed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-region-chip][aria-pressed="true"]')].map((e) => e.getAttribute('data-region-chip')));
  console.log('3b. Toggled chips:', JSON.stringify(pressed),
    pressed.includes('greater_sydney') && pressed.includes('uk') && pressed.length === 2 ? '✓' : 'FAIL');
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView({ block: 'center' }));
  await sleep(500);
  await page.screenshot({ path: path.join(screenshotDir, '1-chips-desktop.png') });
  report('Chips (desktop)', await contrastAudit(page));

  // 375px wrap
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(500);
  await page.screenshot({ path: path.join(screenshotDir, '2-chips-mobile.png') });
  report('Chips (mobile 375px)', await contrastAudit(page));
  let ov = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    chips: [...document.querySelectorAll('[data-region-chip]')].some((el) => el.scrollWidth > el.clientWidth + 1),
  }));
  console.log('3c. Mobile overflow:', JSON.stringify(ov), !ov.doc && !ov.chips ? '✓ (wraps cleanly)' : 'FAIL');

  // Large accessibility fonts: root font-size 24px (150%) — rem-based
  // Tailwind sizes scale; chips must wrap, never overflow their boxes.
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await sleep(600);
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(400);
  await page.screenshot({ path: path.join(screenshotDir, '3-chips-mobile-largefont.png') });
  ov = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    chips: [...document.querySelectorAll('[data-region-chip]')].some((el) => el.scrollWidth > el.clientWidth + 1),
  }));
  console.log('3d. Large-font (24px root) overflow:', JSON.stringify(ov), !ov.doc && !ov.chips ? '✓ (wraps cleanly)' : 'FAIL');
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // Full UI submit with regions + consent
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.type('#wl_first_name', 'TEST RegionsUI');
  await page.type('#wl_email', T_EMAILS.ui);
  await page.click('[data-region-chip="seq"]');
  await page.click('[data-region-chip="other"]');
  await page.click('#wl_consent');
  await page.click('#wl_submit');
  await sleep(3500);
  const success = await page.evaluate(() => !!document.querySelector('[data-waitlist-success]'));
  const c4 = await getByEmail(T_EMAILS.ui);
  console.log('\n3e. UI submit:', success ? 'success state ✓' : 'FAIL',
    '| stored:', JSON.stringify(c4?.launch_regions),
    JSON.stringify(c4?.launch_regions) === '["seq","other"]' && c4?.email_consent_status === 'subscribed' ? '✓' : 'FAIL');

  // --- 4. Geneva record shows the chips ---
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
  await page.goto(`${baseUrl}/geneva/contacts/${c1.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const recordChips = await page.evaluate(() => document.querySelector('[data-launch-regions]')?.innerText ?? null);
  console.log('4. Record shows regions:', JSON.stringify(recordChips?.slice(0, 80)),
    recordChips?.includes('Greater Sydney') && recordChips?.includes('United Kingdom') ? '✓' : 'FAIL');
  await page.screenshot({ path: path.join(screenshotDir, '4-record-regions-desktop.png') });
  report('Record with regions (desktop)', await contrastAudit(page));

  // --- Cleanup (by exact test emails; demo data untouched) ---
  console.log('\nCleaning up test rows...');
  await svc('DELETE', `geneva_contacts?email=in.("${T_EMAILS.valid}","${T_EMAILS.garbage}","${T_EMAILS.absent}","${T_EMAILS.ui}")`);
  const postDemo = await svcCount('geneva_contacts?select=id&email=like.*%40geneva-demo.example');
  const postTotal = await svcCount('geneva_contacts?select=id');
  console.log(`Post-state: ${postTotal} contacts (${postDemo} demo) —`,
    postDemo === preDemo && postTotal === preTotal ? 'demo data untouched ✓' : 'MISMATCH!');

  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — valid: ${c1?.id}, garbage: ${c2?.id}, absent: ${c3?.id}, ui: ${c4?.id} (all deleted)`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
