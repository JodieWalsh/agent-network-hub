/**
 * CRM Phase 4 — stage-age alerts ("Stalling") verification.
 *
 * Seeds 6 SATest households with backdated stage timestamps, then verifies:
 *  - the "Stalling" saved-view chip shows the correct count and filters
 *    list + board,
 *  - the calm champagne stalling chip appears on exactly the right list rows
 *    and board cards (and NOT on fresh/closed/timestamp-less ones),
 *  - engaged households whose BUYING stage moved recently are NOT flagged
 *    (buying_stage_entered_at resets the clock),
 *  - the client record shows the gentle inline nudge with correct stage
 *    label + day count, and no nudge on fine records,
 *  - desktop 1440px + mobile 375px screenshots, WCAG contrast audit on each.
 * Then deletes the test rows and confirms all six CRM tables are back to 0.
 *
 * Seeded set (thresholds: new_enquiry 7 / discovery_booked 14 / engaged 30):
 *   Stallfords    new_enquiry, entered 20d ago            -> STALLING (20>7)
 *   Freshwaters   new_enquiry, entered 2d ago             -> fine
 *   Longsearches  engaged+search_active, buying 40d ago   -> STALLING (40>30)
 *   Movedons      engaged+inspecting, buying 3d ago       -> fine (clock reset)
 *   Wonhomes      closed_won, entered 100d ago            -> fine (closed)
 *   Nodates       discovery_booked, entered NULL          -> fine (graceful)
 * Expected chips: all=6, attention=0, stalling=2, prospects=3, active=2,
 *                 closed=1, settling=0
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const baseUrl = 'http://localhost:8081';
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const screenshotDir = './screenshots/crm-stage-age';
fs.mkdirSync(screenshotDir, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
const dbHeaders = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

const CRM_TABLES = ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities', 'client_properties'];

async function dbCount(table) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: { ...dbHeaders, Prefer: 'count=exact' },
  });
  if (!res.ok) throw new Error(`Count ${table} failed: ${res.status}`);
  return parseInt(res.headers.get('content-range').split('/')[1], 10);
}

async function dbInsert(table, rows) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Insert ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function dbDelete(pathQ) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${pathQ}`, {
    method: 'DELETE', headers: dbHeaders,
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
}

async function getAdminId() {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).user.id;
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

let checkFailures = 0;
function expect(ok, label, detail = '') {
  if (!ok) checkFailures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function readChipCounts(page) {
  return page.evaluate(() => {
    const out = {};
    for (const btn of document.querySelectorAll('[id^="saved-view-"]')) {
      out[btn.id.replace('saved-view-', '')] = parseInt(btn.querySelector('span').textContent, 10);
    }
    return out;
  });
}

const SATEST_NAMES = ['Stallfords', 'Freshwaters', 'Longsearches', 'Movedons', 'Wonhomes', 'Nodates'];

/** household name -> stalling chip title (or null) for visible list rows. */
async function readListStalling(page) {
  return page.evaluate((known) => {
    const out = {};
    for (const li of document.querySelectorAll('li')) {
      const name = known.find((n) => li.textContent.includes(`SATest ${n}`));
      if (!name) continue;
      const chip = li.querySelector('[data-stalling]');
      out[name] = chip ? chip.getAttribute('title') : null;
    }
    return out;
  }, SATEST_NAMES);
}

const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgoIso = (d) => new Date(Date.now() - d * 86400000).toISOString();
const daysFromNow = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

(async () => {
  console.log('=== BASELINE TABLE COUNTS ===');
  for (const t of CRM_TABLES) console.log(`  ${t}: ${await dbCount(t)}`);

  const adminId = await getAdminId();
  console.log(`\nSeeding as agent ${adminId}...`);
  // Every household gets a FUTURE next action so "Needs attention" stays 0 and
  // stalling is isolated from the attention rule.
  const base = {
    agent_id: adminId, household_type: 'couple', client_status: 'active',
    buying_stage: null, buying_stage_entered_at: null,
    next_action_type: 'Check-in call', next_action_date: daysFromNow(10),
    stage_entered_at: null, won_at: null, closed_at: null,
  };
  const seeded = await dbInsert('clients', [
    { ...base, household_name: 'SATest Stallfords', lifecycle_stage: 'new_enquiry', stage_entered_at: daysAgoIso(20) },
    { ...base, household_name: 'SATest Freshwaters', lifecycle_stage: 'new_enquiry', stage_entered_at: daysAgoIso(2) },
    { ...base, household_name: 'SATest Longsearches', lifecycle_stage: 'engaged', stage_entered_at: daysAgoIso(40), buying_stage: 'search_active', buying_stage_entered_at: daysAgoIso(40) },
    { ...base, household_name: 'SATest Movedons', lifecycle_stage: 'engaged', stage_entered_at: daysAgoIso(60), buying_stage: 'inspecting', buying_stage_entered_at: daysAgoIso(3) },
    { ...base, household_name: 'SATest Wonhomes', lifecycle_stage: 'closed_won', stage_entered_at: daysAgoIso(100), client_status: 'won', won_at: daysAgoIso(100), closed_at: daysAgoIso(100) },
    { ...base, household_name: 'SATest Nodates', lifecycle_stage: 'discovery_booked', stage_entered_at: null },
  ]);
  const ID = Object.fromEntries(seeded.map((r) => [r.household_name.replace('SATest ', ''), r.id]));
  console.log('TEST CLIENT IDS:', JSON.stringify(ID, null, 2));

  const EXPECTED = { all: 6, attention: 0, stalling: 2, prospects: 3, active: 2, closed: 1, settling: 0 };

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('\nLogging in...');
    await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#email', { timeout: 15000 });
    await page.type('#email', EMAIL);
    await page.type('#password', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
    ]);
    await pause(3000);

    // --- Chip counts incl. new Stalling chip ---
    console.log('\n=== CHIP COUNTS (DESKTOP LIST, ALL) ===');
    await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    await page.waitForSelector('#saved-view-stalling', { timeout: 10000 });
    const counts = await readChipCounts(page);
    for (const [k, v] of Object.entries(EXPECTED)) {
      expect(counts[k] === v, `chip "${k}" count`, `expected ${v}, got ${counts[k]}`);
    }

    // --- Per-row stalling indicators on the All list ---
    console.log('\n=== LIST INDICATORS (ALL VIEW) ===');
    const listStalling = await readListStalling(page);
    expect(listStalling.Stallfords === 'In New Enquiry for 20 days', 'Stallfords chip + tooltip', String(listStalling.Stallfords));
    expect(listStalling.Longsearches === 'In Search Active for 40 days', 'Longsearches chip measures BUYING stage', String(listStalling.Longsearches));
    expect(listStalling.Freshwaters === null, 'Freshwaters (2d) has NO chip');
    expect(listStalling.Movedons === null, 'Movedons NOT flagged — buying stage moved 3d ago resets clock');
    expect(listStalling.Wonhomes === null, 'Wonhomes (closed) has NO chip');
    expect(listStalling.Nodates === null, 'Nodates (null timestamp) degrades gracefully — NO chip');
    await shot(page, '01-all-list-desktop');
    report('all list with stalling chips', await contrastAudit(page));

    // --- Stalling saved view: list ---
    console.log('\n=== STALLING VIEW — LIST ===');
    await page.click('#saved-view-stalling');
    await pause(600);
    const filtered = await readListStalling(page);
    expect(
      Object.keys(filtered).length === 2 && 'Stallfords' in filtered && 'Longsearches' in filtered,
      'stalling view shows exactly Stallfords + Longsearches', JSON.stringify(Object.keys(filtered))
    );
    await shot(page, '02-stalling-list-desktop');
    report('stalling list', await contrastAudit(page));

    // --- Stalling saved view: board ---
    console.log('\n=== STALLING VIEW — BOARD ===');
    await page.click('#view-board');
    await pause(1000);
    const boardStalling = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-board-card]'));
      return {
        total: cards.length,
        withChip: cards.filter((c) => c.querySelector('[data-stalling]')).length,
      };
    });
    expect(boardStalling.total === 2 && boardStalling.withChip === 2,
      'stalling board shows 2 cards, both with the champagne chip', JSON.stringify(boardStalling));
    await shot(page, '03-stalling-board-desktop');
    report('stalling board', await contrastAudit(page));

    // --- Client record: gentle nudge present ---
    console.log('\n=== CLIENT RECORD NUDGES ===');
    await page.goto(`${baseUrl}/clients/${ID.Stallfords}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    let nudge = await page.evaluate(() => {
      const el = document.querySelector('[data-stage-nudge]');
      return el ? el.textContent : null;
    });
    expect(!!nudge && nudge.includes('New Enquiry') && nudge.includes('20 days') && nudge.includes('consider a next step'),
      'Stallfords record shows gentle nudge (New Enquiry, 20 days)', String(nudge));
    await shot(page, '04-record-nudge-desktop');
    report('record with nudge', await contrastAudit(page));

    await page.goto(`${baseUrl}/clients/${ID.Longsearches}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    nudge = await page.evaluate(() => document.querySelector('[data-stage-nudge]')?.textContent || null);
    expect(!!nudge && nudge.includes('Search Active') && nudge.includes('40 days'),
      'Longsearches record nudge uses BUYING stage label', String(nudge));

    await page.goto(`${baseUrl}/clients/${ID.Movedons}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    let noNudge = await page.evaluate(() => !document.querySelector('[data-stage-nudge]'));
    expect(noNudge, 'Movedons record shows NO nudge (buying clock reset)');

    await page.goto(`${baseUrl}/clients/${ID.Nodates}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    noNudge = await page.evaluate(() => !document.querySelector('[data-stage-nudge]'));
    expect(noNudge, 'Nodates record shows NO nudge (null timestamp, no error)');

    // --- Mobile 375px ---
    console.log('\n=== MOBILE 375px ===');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2500);
    await page.click('#saved-view-stalling');
    await pause(600);
    await shot(page, '05-stalling-list-mobile');
    report('mobile stalling list', await contrastAudit(page));
    await page.goto(`${baseUrl}/clients/${ID.Stallfords}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    await shot(page, '06-record-nudge-mobile');
    report('mobile record with nudge', await contrastAudit(page));
    const hScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(hScroll.sw <= hScroll.cw, 'no page-level horizontal scroll on mobile', JSON.stringify(hScroll));
  } finally {
    await browser.close().catch(() => {});
  }

  // --- Cleanup ---
  console.log('\n=== CLEANUP ===');
  const idList = Object.values(ID).join(',');
  for (const t of CRM_TABLES.filter((t) => t !== 'clients')) {
    await dbDelete(`${t}?client_id=in.(${idList})`);
  }
  await dbDelete(`clients?id=in.(${idList})`);
  let allZero = true;
  for (const t of CRM_TABLES) {
    const n = await dbCount(t);
    if (n !== 0) allZero = false;
    console.log(`  ${t}: ${n} rows`);
  }
  expect(allZero, 'all six CRM tables back to 0 rows');

  console.log('\n================ RESULT ================');
  console.log('Check failures:', checkFailures);
  console.log('Contrast issues total:', contrastFailures);
  console.log('TEST CLIENT IDS (deleted):', JSON.stringify(ID, null, 2));
  console.log('Screenshots in', screenshotDir);
  process.exit(checkFailures === 0 && contrastFailures === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
