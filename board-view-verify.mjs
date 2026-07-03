/**
 * CRM Clients board (Kanban) view verification (Phase 1 leftover).
 * Uses the pre-seeded Boardtest households. Screenshots the List/Board toggle,
 * the board in both modes, a card mid-drag, and mobile 375px. Verifies column
 * membership in both modes, performs a real drag-and-drop (synthetic
 * DragEvents), then confirms the DB stage + entered-at timestamp + timeline
 * entry. WCAG contrast audit on every screen.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const IDS = {
  ashford: 'c19befdc-4f6d-487b-8625-06554cd05328',   // new_enquiry, no buying
  byrne: 'b8f3a621-f62f-4082-b408-fecf71c05201',     // discovery_booked, no buying, needs attention
  castellan: 'ef194e4e-565c-4257-843e-39b3118f9d1f', // engaged, search_active
  delacroix: '29d72177-4929-4183-a4f2-80874c0e1533', // engaged, offer_submitted, overdue action
};

const screenshotDir = './screenshots/crm-board-view';
fs.mkdirSync(screenshotDir, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
const dbHeaders = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` };
async function dbGet(pathQ) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${pathQ}`, { headers: dbHeaders });
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

/** Map of clientId -> column token, read from the rendered board DOM. */
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

let checkFailures = 0;
function expectPlacement(placement, id, expectedCol, label) {
  const actual = placement[id];
  const ok = actual === expectedCol;
  if (!ok) checkFailures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: expected column "${expectedCol}", got "${actual}"`);
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

  // --- List view with toggle ---
  console.log('\n=== LIST VIEW + TOGGLE (DESKTOP) ===');
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2000);
  await page.waitForSelector('#view-board', { timeout: 10000 });
  await shot(page, 'clients-list-with-toggle');
  report('list view with toggle', await contrastAudit(page));

  // --- Board: By Relationship (lifecycle) ---
  console.log('\n=== BOARD — BY RELATIONSHIP ===');
  await page.click('#view-board');
  await pause(1000);
  await shot(page, 'board-lifecycle-desktop');
  report('board (lifecycle, desktop)', await contrastAudit(page));

  let placement = await readBoardPlacement(page);
  expectPlacement(placement, IDS.ashford, 'new_enquiry', 'Ashford on lifecycle board');
  expectPlacement(placement, IDS.byrne, 'discovery_booked', 'Byrne on lifecycle board');
  expectPlacement(placement, IDS.castellan, 'engaged', 'Castellan on lifecycle board');
  expectPlacement(placement, IDS.delacroix, 'engaged', 'Delacroix on lifecycle board');

  // --- Board: By Buying Stage ---
  console.log('\n=== BOARD — BY BUYING STAGE ===');
  await page.click('#board-mode-buying');
  await pause(1000);
  await shot(page, 'board-buying-desktop');
  report('board (buying, desktop)', await contrastAudit(page));

  placement = await readBoardPlacement(page);
  expectPlacement(placement, IDS.ashford, 'none', 'Ashford on buying board (Not Started)');
  expectPlacement(placement, IDS.byrne, 'none', 'Byrne on buying board (Not Started)');
  expectPlacement(placement, IDS.castellan, 'search_active', 'Castellan on buying board');
  expectPlacement(placement, IDS.delacroix, 'offer_submitted', 'Delacroix on buying board');

  // --- Drag & drop: Byrne discovery_booked -> discovery_completed ---
  console.log('\n=== DRAG & DROP (lifecycle board) ===');
  await page.click('#board-mode-lifecycle');
  await pause(800);

  const [beforeRow] = await dbGet(`clients?id=eq.${IDS.byrne}&select=lifecycle_stage,stage_entered_at`);
  console.log('DB BEFORE (Byrne):', JSON.stringify(beforeRow));

  // Synthetic HTML5 drag: dragstart on the card, dragover on the target column…
  await page.evaluate((cardId) => {
    const card = document.querySelector(`[data-board-card="${cardId}"]`);
    const col = document.querySelector('[data-board-col="discovery_completed"]');
    window.__dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
  }, IDS.byrne);
  await pause(500);
  await shot(page, 'board-mid-drag');
  report('board mid-drag', await contrastAudit(page));

  // …then drop + dragend.
  await page.evaluate((cardId) => {
    const card = document.querySelector(`[data-board-card="${cardId}"]`);
    const col = document.querySelector('[data-board-col="discovery_completed"]');
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: window.__dt }));
  }, IDS.byrne);
  await pause(2500);
  await shot(page, 'board-after-drop');
  report('board after drop', await contrastAudit(page));

  placement = await readBoardPlacement(page);
  expectPlacement(placement, IDS.byrne, 'discovery_completed', 'Byrne after drag');

  // --- Card click still navigates ---
  await page.click(`[data-board-card="${IDS.ashford}"]`);
  await pause(2000);
  const navOk = page.url().includes(IDS.ashford);
  if (!navOk) checkFailures++;
  console.log(`${navOk ? 'OK  ' : 'FAIL'} card click navigates to record (${page.url()})`);

  // --- Mobile 375px ---
  console.log('\n=== MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2500);
  await page.click('#view-board');
  await pause(1000);
  await shot(page, 'board-lifecycle-mobile');
  report('board (mobile)', await contrastAudit(page));
  const hScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(hScroll.sw > hScroll.cw ? `PAGE-LEVEL HORIZONTAL SCROLL: ${JSON.stringify(hScroll)}` : 'No page-level horizontal scroll on mobile (board scrolls inside its own container).');

  await browser.close().catch(() => {});

  // --- DB verification ---
  const [afterRow] = await dbGet(`clients?id=eq.${IDS.byrne}&select=lifecycle_stage,stage_entered_at`);
  console.log('\nDB AFTER (Byrne):', JSON.stringify(afterRow));
  const acts = await dbGet(`client_activities?client_id=eq.${IDS.byrne}&event_type=eq.lifecycle_stage_changed&select=event_type,event_context,created_at&order=created_at.asc`);
  console.log('STAGE ACTIVITIES (Byrne):', JSON.stringify(acts, null, 2));

  const dbOk =
    afterRow.lifecycle_stage === 'discovery_completed' &&
    afterRow.stage_entered_at !== beforeRow.stage_entered_at &&
    acts.length === 1 &&
    acts[0].event_context?.from === 'discovery_booked' &&
    acts[0].event_context?.to === 'discovery_completed';
  if (!dbOk) checkFailures++;

  console.log('\n================ RESULT ================');
  console.log('DB checks:', dbOk ? 'PASS' : 'FAIL');
  console.log('Placement/nav check failures:', checkFailures - (dbOk ? 0 : 1));
  console.log('Contrast issues total:', contrastFailures);
  console.log('TEST CLIENT IDS (for cleanup):', JSON.stringify(IDS, null, 2));
  console.log('Screenshots in', screenshotDir);
  process.exit(checkFailures === 0 && contrastFailures === 0 ? 0 : 1);
})();
