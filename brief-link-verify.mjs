/**
 * Clients ↔ Briefs linking verification — CRM Phase 2.
 *
 * Seeds ONE test household + ONE test brief (service key, agent = seeded
 * admin), then drives the real UI: Brief tab empty state → Link-a-Brief modal
 * → link → DB check (client_id set + brief_linked activity) → brief summary
 * → unlink confirm → unlink → DB check (client_id null + brief_unlinked).
 * Screenshots + WCAG contrast at desktop and 375px mobile throughout.
 * Finally deletes ALL test data and confirms CRM tables at 0 rows and no
 * orphan test brief.
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
if (!SUPABASE_URL || !SECRET) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const screenshotDir = './screenshots/brief-linking';
fs.mkdirSync(screenshotDir, { recursive: true });

const svcHeaders = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function svc(method, pathAndQuery, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: svcHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} failed ${res.status}: ${await res.text()}`);
  return method === 'DELETE' ? null : res.json();
}

async function svcCount(pathAndQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method: 'HEAD',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, Prefer: 'count=exact' },
  });
  const total = res.headers.get('content-range')?.split('/')[1];
  return total && total !== '*' ? parseInt(total, 10) : -1;
}

/* Same WCAG text-contrast audit as dashboard-verify.mjs */
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
      let bg = null;
      let node = el;
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

function report(label, issues) {
  if (issues.length) {
    console.log(`${label}: CONTRAST ISSUES (${issues.length}):`);
    issues.forEach((i) => console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`));
  } else {
    console.log(`${label}: no contrast issues.`);
  }
}

async function noHScroll(page, label) {
  const h = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth,
  }));
  console.log(h.sw > h.cw || h.bw > h.cw ? `${label}: HORIZONTAL SCROLL DETECTED ${JSON.stringify(h)}` : `${label}: no horizontal scrolling.`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });

(async () => {
  const preBriefCount = await svcCount('client_briefs?select=id');
  console.log('Pre-existing client_briefs rows:', preBriefCount);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --- Login ---
  console.log('Logging in...');
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
  const adminId = await page.evaluate((projectId) => {
    const raw = localStorage.getItem(`sb-${projectId}-auth-token`);
    return raw ? JSON.parse(raw)?.user?.id ?? null : null;
  }, process.env.VITE_SUPABASE_PROJECT_ID);
  if (!adminId) throw new Error('Could not read admin user id');
  console.log('Admin user id:', adminId);

  // --- Seed: one household + one unlinked brief ---
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [household] = await svc('POST', 'clients', [{
    agent_id: adminId,
    household_name: 'TEST Linkage Household',
    household_type: 'couple',
    lifecycle_stage: 'engaged',
    client_status: 'active',
    next_action_date: fmtDate(nextWeek),
    next_action_type: 'Discovery call',
  }]);
  const [testBrief] = await svc('POST', 'client_briefs', [{
    agent_id: adminId,
    client_name: 'TEST Brief Client',
    brief_name: 'TEST Coastal Search',
    status: 'active',
    budget_min: 900000,
    budget_max: 1200000,
    bedrooms_min: 3,
    bedrooms_max: 4,
    bathrooms_min: 2,
    location_summary: 'Northern Beaches, Sydney',
    property_types: ['house', 'townhouse'],
    must_have_features: ['ocean_view', 'double_garage', 'home_office'],
  }]);
  console.log('Seeded household id:', household.id);
  console.log('Seeded brief id:   ', testBrief.id);

  const recordUrl = `${baseUrl}/clients/${household.id}`;

  // --- 1. Brief tab: empty state (desktop) ---
  await page.goto(recordUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.click('#tab-brief');
  await sleep(600);
  await shot(page, '1-brief-tab-empty-desktop.png');
  report('Empty brief tab (desktop)', await contrastAudit(page));

  // --- 2. Link-a-Brief modal (desktop) ---
  await page.click('#link_brief_btn');
  await sleep(1200);
  await shot(page, '2-link-modal-desktop.png');
  report('Link modal (desktop)', await contrastAudit(page));

  // --- 3. Link-a-Brief modal (mobile) ---
  await page.setViewport({ width: 375, height: 812 });
  await sleep(600);
  await shot(page, '3-link-modal-mobile.png');
  report('Link modal (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Link modal (mobile)');

  // --- 4. Select the test brief and link it (back on desktop) ---
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(400);
  await page.click('[data-brief-option="TEST Coastal Search"]');
  await sleep(300);
  await page.click('#link_brief_save');
  await sleep(3000);

  // --- DB check: linked ---
  const [afterLink] = await svc('GET', `client_briefs?id=eq.${testBrief.id}&select=id,client_id`);
  const linkActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.brief_linked&select=id,event_context`);
  console.log('\nDB after link: brief.client_id =', afterLink.client_id,
    afterLink.client_id === household.id ? '(== household id ✓)' : '(MISMATCH!)');
  console.log('brief_linked timeline entries:', linkActs.length, JSON.stringify(linkActs[0]?.event_context));

  // --- 5. Linked brief summary (desktop, wait out the toast) ---
  await sleep(3000);
  await shot(page, '4-brief-summary-desktop.png');
  report('Brief summary (desktop)', await contrastAudit(page));

  // --- 6. Linked brief summary (mobile) ---
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(recordUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.click('#tab-brief');
  await sleep(600);
  await shot(page, '5-brief-summary-mobile.png');
  report('Brief summary (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Brief summary (mobile)');

  // --- 7. Unlink confirm (mobile, then desktop) ---
  await page.click('#unlink_brief_btn');
  await sleep(600);
  await shot(page, '6-unlink-confirm-mobile.png');
  report('Unlink confirm (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Unlink confirm (mobile)');

  await page.setViewport({ width: 1440, height: 900 });
  await sleep(600);
  await shot(page, '7-unlink-confirm-desktop.png');
  report('Unlink confirm (desktop)', await contrastAudit(page));

  // --- 8. Confirm unlink ---
  await page.click('#unlink_brief_confirm');
  await sleep(3000);

  // --- DB check: unlinked ---
  const [afterUnlink] = await svc('GET', `client_briefs?id=eq.${testBrief.id}&select=id,client_id`);
  const unlinkActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.brief_unlinked&select=id,event_context`);
  console.log('\nDB after unlink: brief.client_id =', afterUnlink.client_id,
    afterUnlink.client_id === null ? '(null ✓)' : '(MISMATCH!)');
  console.log('brief_unlinked timeline entries:', unlinkActs.length, JSON.stringify(unlinkActs[0]?.event_context));

  await sleep(2000);
  await shot(page, '8-brief-tab-after-unlink-desktop.png');

  // --- Cleanup ---
  console.log('\nDeleting test data...');
  await svc('DELETE', `clients?id=eq.${household.id}`); // cascades members/tasks/notes/activities
  await svc('DELETE', `client_briefs?id=eq.${testBrief.id}`);

  console.log('\nFinal counts:');
  for (const t of ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)}`);
  }
  const remainingTestBrief = await svcCount(`client_briefs?id=eq.${testBrief.id}&select=id`);
  const finalBriefCount = await svcCount('client_briefs?select=id');
  console.log(`  test brief remaining: ${remainingTestBrief} (expect 0)`);
  console.log(`  client_briefs total: ${finalBriefCount} (expect ${preBriefCount})`);

  await browser.close().catch(() => {});
  console.log('\nDone. Screenshots in', screenshotDir);
  process.exit(0);
})();
