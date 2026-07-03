/**
 * CRM stage-controls verification (Phase 1 leftover).
 * Creates one test household via the real UI, changes its lifecycle stage AND
 * buying stage through the new stage-picker dialogs, screenshots the dialog +
 * updated badges + timeline entries (desktop + 375px mobile), runs the WCAG
 * contrast audit throughout, then reads the DB (service key, read-only) to
 * confirm stages, entered-at timestamps, and the two timeline rows.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const screenshotDir = './screenshots/crm-stage-controls';
fs.mkdirSync(screenshotDir, { recursive: true });

// --- .env (for the read-only DB verification) ---
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
const SB_URL = env.VITE_SUPABASE_URL;
const SB_SECRET = env.SUPABASE_SECRET_KEY;
const dbHeaders = { apikey: SB_SECRET, Authorization: `Bearer ${SB_SECRET}` };

async function dbGet(pathQ) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathQ}`, { headers: dbHeaders });
  if (!res.ok) throw new Error(`DB read failed: ${res.status} ${await res.text()}`);
  return res.json();
}

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
    console.log(`CONTRAST ISSUES on ${label} (${issues.length}):`);
    issues.forEach((i) => console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`));
  } else {
    console.log(`No contrast issues on ${label}.`);
  }
}

async function setReactValue(page, selector, value) {
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Logging in...');
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await pause(3000);

  // --- Create test household via the real form ---
  console.log('\n=== CREATE TEST HOUSEHOLD ===');
  await page.goto(`${baseUrl}/clients/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('#household_name', { timeout: 10000 });
  await setReactValue(page, '#household_name', 'Stagetest Household');
  await setReactValue(page, '#household_type', 'couple');
  await setReactValue(page, '#lead_source', 'Stage-controls verification — safe to delete');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await setReactValue(page, '#next_action_date', tomorrow);
  await setReactValue(page, '#next_action_type', 'Book discovery call');
  await setReactValue(page, '#member_0_first', 'Stella');
  await setReactValue(page, '#member_0_last', 'Stagetest');
  await page.click('#save_client');
  await pause(4000);

  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2000);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Stagetest Household'));
    if (btn) btn.click();
  });
  await pause(2500);
  const detailUrl = page.url();
  const clientId = detailUrl.split('/clients/')[1];
  console.log('TEST CLIENT ID:', clientId);
  if (!clientId || clientId.includes('clients')) throw new Error('Could not resolve test client id');

  // --- DB state BEFORE changes ---
  const [before] = await dbGet(`clients?id=eq.${clientId}&select=lifecycle_stage,stage_entered_at,buying_stage,buying_stage_entered_at`);
  console.log('\nDB BEFORE:', JSON.stringify(before, null, 2));

  // --- Lifecycle stage change: new_enquiry -> discovery_booked ---
  console.log('\n=== LIFECYCLE STAGE CHANGE (DESKTOP) ===');
  await page.click('#stage-badge-lifecycle');
  await pause(700);
  await shot(page, 'stage-dialog-lifecycle-desktop');
  report('lifecycle stage dialog (desktop)', await contrastAudit(page));
  await page.click('#stage-opt-discovery_booked');
  await pause(400);
  await shot(page, 'stage-dialog-lifecycle-selected');
  await page.click('#stage_save');
  await pause(2500);
  await shot(page, 'stage-badges-after-lifecycle');
  report('summary after lifecycle change', await contrastAudit(page));

  // --- Buying stage change: not started -> brief_confirmed ---
  console.log('\n=== BUYING STAGE CHANGE (DESKTOP) ===');
  await page.click('#stage-badge-buying');
  await pause(700);
  await shot(page, 'stage-dialog-buying-desktop');
  report('buying stage dialog (desktop)', await contrastAudit(page));
  await page.click('#stage-opt-brief_confirmed');
  await pause(400);
  await page.click('#stage_save');
  await pause(2500);
  await shot(page, 'stage-badges-after-buying');
  report('summary after buying change', await contrastAudit(page));

  // --- Timeline shows both entries without a reload ---
  console.log('\n=== TIMELINE (no full reload) ===');
  await page.click('#tab-timeline');
  await pause(800);
  await shot(page, 'stage-timeline-desktop');
  report('timeline with stage entries', await contrastAudit(page));
  const timelineText = await page.evaluate(() =>
    [...document.querySelectorAll('ol li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4)
  );
  console.log('Top timeline entries:', JSON.stringify(timelineText, null, 2));

  // --- Mobile 375px ---
  console.log('\n=== MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(detailUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2500);
  await shot(page, 'stage-badges-mobile');
  report('summary (mobile)', await contrastAudit(page));
  await page.click('#stage-badge-lifecycle');
  await pause(700);
  await shot(page, 'stage-dialog-mobile');
  report('stage dialog (mobile)', await contrastAudit(page));
  const hScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(hScroll.sw > hScroll.cw ? `HORIZONTAL SCROLL: ${JSON.stringify(hScroll)}` : 'No horizontal scroll on mobile.');

  await browser.close().catch(() => {});

  // --- DB state AFTER changes ---
  const [after] = await dbGet(`clients?id=eq.${clientId}&select=lifecycle_stage,stage_entered_at,buying_stage,buying_stage_entered_at`);
  console.log('\nDB AFTER:', JSON.stringify(after, null, 2));
  const acts = await dbGet(`client_activities?client_id=eq.${clientId}&event_type=in.(lifecycle_stage_changed,buying_stage_changed)&select=event_type,event_context,created_at&order=created_at.asc`);
  console.log('STAGE ACTIVITIES:', JSON.stringify(acts, null, 2));

  const ok =
    after.lifecycle_stage === 'discovery_booked' &&
    after.buying_stage === 'brief_confirmed' &&
    after.stage_entered_at !== before.stage_entered_at &&
    !!after.buying_stage_entered_at &&
    acts.length === 2 &&
    acts.some((a) => a.event_type === 'lifecycle_stage_changed' && a.event_context?.from === 'new_enquiry' && a.event_context?.to === 'discovery_booked') &&
    acts.some((a) => a.event_type === 'buying_stage_changed' && a.event_context?.from === null && a.event_context?.to === 'brief_confirmed');

  console.log('\n================ RESULT ================');
  console.log('DB checks:', ok ? 'PASS' : 'FAIL');
  console.log('Contrast issues total:', contrastFailures);
  console.log('TEST CLIENT ID (for cleanup):', clientId);
  console.log('Screenshots in', screenshotDir);
  process.exit(ok && contrastFailures === 0 ? 0 : 1);
})();
