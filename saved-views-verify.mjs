/**
 * CRM Phase 4 — saved views (filter chips) verification.
 *
 * Seeds 5 SVTest households across lifecycle/buying stages, then verifies:
 *  - every chip shows the correct count,
 *  - clicking a chip filters BOTH the list and the board (cards reduced,
 *    columns intact),
 *  - the chosen view persists across the list/board toggle,
 *  - the calm per-view empty state (after neutralising "needs attention"),
 *  - desktop 1440px + mobile 375px screenshots, WCAG contrast audit on each.
 * Then deletes the test rows and confirms all six CRM tables are back to 0.
 *
 * Expected chip counts for the seeded set:
 *   All=5, Needs attention=2 (B,D), Prospects=2 (A,B),
 *   Active clients=2 (C,D), Closing/closed=1 (E), Settling=1 (D)
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const baseUrl = 'http://localhost:8081';
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const screenshotDir = './screenshots/crm-saved-views';
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

async function dbPatch(pathQ, body) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${pathQ}`, {
    method: 'PATCH', headers: dbHeaders, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Patch failed: ${res.status} ${await res.text()}`);
}

async function dbDelete(pathQ) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${pathQ}`, {
    method: 'DELETE', headers: dbHeaders,
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
}

/** Admin user id via password grant (user-level auth pattern from CLAUDE.md). */
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

/** Chip label -> count, read from the rendered chip row. */
async function readChipCounts(page) {
  return page.evaluate(() => {
    const out = {};
    for (const btn of document.querySelectorAll('[id^="saved-view-"]')) {
      out[btn.id.replace('saved-view-', '')] = parseInt(btn.querySelector('span').textContent, 10);
    }
    return out;
  });
}

/** SVTest household names currently visible as list rows. */
const SVTEST_NAMES = ['Aldertons', 'Bellweathers', 'Carmichaels', 'Davenports', 'Everleighs'];
async function readVisibleListNames(page) {
  return page.evaluate((known) =>
    Array.from(document.querySelectorAll('li'))
      .map((li) => known.find((n) => li.textContent.includes(`SVTest ${n}`)))
      .filter(Boolean)
      .map((n) => `SVTest ${n}`),
    SVTEST_NAMES
  );
}

/** clientId -> board column token from the rendered board. */
async function readBoardPlacement(page) {
  return page.evaluate(() => {
    const placement = {};
    for (const col of document.querySelectorAll('[data-board-col]')) {
      for (const card of col.querySelectorAll('[data-board-card]')) {
        placement[card.getAttribute('data-board-card')] = col.getAttribute('data-board-col');
      }
    }
    return placement;
  });
}

const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const daysFromNow = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

(async () => {
  // --- Baseline: all six CRM tables should start empty ---
  console.log('=== BASELINE TABLE COUNTS ===');
  for (const t of CRM_TABLES) console.log(`  ${t}: ${await dbCount(t)}`);

  // --- Seed test households ---
  const adminId = await getAdminId();
  console.log(`\nSeeding as agent ${adminId}...`);
  // PostgREST bulk insert requires identical keys on every row.
  const now = new Date().toISOString();
  const base = { agent_id: adminId, client_status: 'active', buying_stage: null, buying_stage_entered_at: null, next_action_type: null, next_action_date: null, won_at: null, closed_at: null };
  const seeded = await dbInsert('clients', [
    { ...base, household_name: 'SVTest Aldertons', household_type: 'couple', lifecycle_stage: 'new_enquiry', next_action_type: 'Discovery call', next_action_date: daysFromNow(7) },
    { ...base, household_name: 'SVTest Bellweathers', household_type: 'family', lifecycle_stage: 'discovery_booked' },
    { ...base, household_name: 'SVTest Carmichaels', household_type: 'couple', lifecycle_stage: 'engaged', buying_stage: 'search_active', buying_stage_entered_at: now, next_action_type: 'Shortlist review', next_action_date: daysFromNow(3) },
    { ...base, household_name: 'SVTest Davenports', household_type: 'family', lifecycle_stage: 'engaged', buying_stage: 'under_contract', buying_stage_entered_at: now, next_action_type: 'Contract follow-up', next_action_date: daysFromNow(-2) },
    { ...base, household_name: 'SVTest Everleighs', household_type: 'single', lifecycle_stage: 'closed_won', client_status: 'won', won_at: now, closed_at: now },
  ]);
  const ID = Object.fromEntries(seeded.map((r) => [r.household_name.replace('SVTest ', ''), r.id]));
  console.log('TEST CLIENT IDS:', JSON.stringify(ID, null, 2));

  const EXPECTED = { all: 5, attention: 2, prospects: 2, active: 2, closed: 1, settling: 1 };

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

    // --- Chips + counts (desktop, list, All) ---
    console.log('\n=== CHIP COUNTS (DESKTOP LIST) ===');
    await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2000);
    await page.waitForSelector('#saved-view-all', { timeout: 10000 });
    const counts = await readChipCounts(page);
    for (const [k, v] of Object.entries(EXPECTED)) {
      expect(counts[k] === v, `chip "${k}" count`, `expected ${v}, got ${counts[k]}`);
    }
    await shot(page, '01-chips-all-list-desktop');
    report('all-clients list with chips', await contrastAudit(page));

    // --- Needs attention: list ---
    console.log('\n=== NEEDS ATTENTION — LIST ===');
    await page.click('#saved-view-attention');
    await pause(600);
    let names = await readVisibleListNames(page);
    expect(
      names.length === 2 && names.includes('SVTest Bellweathers') && names.includes('SVTest Davenports'),
      'attention list shows exactly Bellweathers + Davenports', JSON.stringify(names)
    );
    await shot(page, '02-attention-list-desktop');
    report('attention list', await contrastAudit(page));

    // --- Needs attention: board (filter persists across toggle) ---
    console.log('\n=== NEEDS ATTENTION — BOARD (persistence across toggle) ===');
    await page.click('#view-board');
    await pause(1000);
    const stillActive = await page.$eval('#saved-view-attention', (b) => b.getAttribute('aria-pressed'));
    expect(stillActive === 'true', 'attention chip still active after list->board toggle');
    let placement = await readBoardPlacement(page);
    expect(Object.keys(placement).length === 2, 'board shows exactly 2 cards', JSON.stringify(placement));
    expect(placement[ID.Bellweathers] === 'discovery_booked', 'Bellweathers in discovery_booked column');
    expect(placement[ID.Davenports] === 'engaged', 'Davenports in engaged column');
    const colCount = await page.$$eval('[data-board-col]', (cols) => cols.length);
    expect(colCount === 6, 'all 6 lifecycle columns still render while filtered', `got ${colCount}`);
    await shot(page, '03-attention-board-desktop');
    report('attention board', await contrastAudit(page));

    // --- Settling: board in buying mode ---
    console.log('\n=== SETTLING — BOARD (BUYING MODE) ===');
    await page.click('#saved-view-settling');
    await pause(400);
    await page.click('#board-mode-buying');
    await pause(800);
    placement = await readBoardPlacement(page);
    expect(
      Object.keys(placement).length === 1 && placement[ID.Davenports] === 'under_contract',
      'settling board shows only Davenports under contract', JSON.stringify(placement)
    );
    await shot(page, '04-settling-board-buying-desktop');
    report('settling board (buying mode)', await contrastAudit(page));

    // --- Prospects: back to list ---
    console.log('\n=== PROSPECTS — LIST ===');
    await page.click('#saved-view-prospects');
    await pause(400);
    await page.click('#view-list');
    await pause(600);
    names = await readVisibleListNames(page);
    expect(
      names.length === 2 && names.includes('SVTest Aldertons') && names.includes('SVTest Bellweathers'),
      'prospects list shows exactly Aldertons + Bellweathers', JSON.stringify(names)
    );
    await shot(page, '05-prospects-list-desktop');
    report('prospects list', await contrastAudit(page));

    // --- Empty state: give B and D future actions so "attention" matches none ---
    console.log('\n=== EMPTY STATE (needs attention -> none) ===');
    await dbPatch(`clients?id=in.(${ID.Bellweathers},${ID.Davenports})`, { next_action_date: daysFromNow(14), next_action_type: 'Check-in call' });
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await pause(2000);
    await page.click('#saved-view-attention');
    await pause(600);
    const emptyCopyShown = await page.evaluate(() =>
      document.body.textContent.includes('Nothing needs attention right now')
    );
    expect(emptyCopyShown, 'calm empty state copy shown for empty "Needs attention"');
    await shot(page, '06-attention-empty-desktop');
    report('attention empty state', await contrastAudit(page));

    // "View all clients" escape hatch returns to All
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'View all clients');
      btn && btn.click();
    });
    await pause(600);
    names = await readVisibleListNames(page);
    expect(names.length === 5, '"View all clients" returns to All (5 rows)', JSON.stringify(names));

    // --- Mobile 375px ---
    console.log('\n=== MOBILE 375px ===');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await pause(2500);
    await shot(page, '07-chips-all-list-mobile');
    report('mobile list with chips', await contrastAudit(page));
    await page.click('#saved-view-prospects');
    await pause(600);
    names = await readVisibleListNames(page);
    expect(names.length === 2, 'mobile prospects list filtered to 2 rows', JSON.stringify(names));
    await shot(page, '08-prospects-list-mobile');
    report('mobile prospects list', await contrastAudit(page));
    await page.click('#view-board');
    await pause(1000);
    await shot(page, '09-prospects-board-mobile');
    report('mobile prospects board', await contrastAudit(page));
    const hScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(hScroll.sw <= hScroll.cw, 'no page-level horizontal scroll on mobile', JSON.stringify(hScroll));
  } finally {
    await browser.close().catch(() => {});
  }

  // --- Cleanup: delete test rows, confirm all six tables at 0 ---
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
