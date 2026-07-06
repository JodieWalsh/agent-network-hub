/**
 * CRM stage-suggestions verification — CRM Phase 4 (lightweight automations).
 *
 * Uses REAL marketplace properties (read-only). Seeds ONE test household,
 * links real properties, then drives the real UI:
 *   1. property → offered via UI  → offered suggestion banner appears
 *   2. accept                     → buying_stage = offer_submitted + timeline
 *   3. property → purchased (svc) → closed-won suggestion appears
 *   4. dismiss → banner gone; reload → banner back (session-only dismissal)
 *   5. accept  → buying under_contract + lifecycle closed_won + 2 timeline rows
 *   6. lifecycle → closed_lost via dialog with reason → lost_reason saved,
 *      reason in timeline context, no suggestions while closed
 * Desktop + 375px mobile, WCAG contrast audits, no horizontal scroll.
 * Cleanup: household deleted (cascade); 6 CRM tables at 0; properties table
 * count AND max(updated_at) unchanged.
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

const screenshotDir = './screenshots/stage-suggestions';
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
const clickByAttr = (page, attr, value) =>
  page.evaluate(({ attr, value }) => {
    const el = [...document.querySelectorAll(`[${attr}]`)].find((b) => b.getAttribute(attr) === value);
    if (!el) throw new Error(`No element with ${attr}="${value}"`);
    el.click();
  }, { attr, value });
const suggestionOnPage = (page) =>
  page.evaluate(() => document.querySelector('[data-stage-suggestion]')?.getAttribute('data-stage-suggestion') ?? null);

async function openRecord(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    if (page.url().includes('/clients/') && (await page.$('#stage-badge-lifecycle'))) return;
    console.log(`  (attempt ${attempt}: landed on ${page.url()}, retrying)`);
  }
  throw new Error('Could not open the client record (kept redirecting)');
}

(async () => {
  // --- Pre-state ---
  const prePropCount = await svcCount('properties?select=id');
  const [preMax] = await svc('GET', 'properties?select=updated_at&order=updated_at.desc&limit=1');
  console.log(`Pre-existing: properties=${prePropCount}, max updated_at=${preMax.updated_at}`);
  for (const t of ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities', 'client_properties']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }

  // Two real properties with distinct addresses (read-only)
  const candidates = await svc('GET',
    'properties?select=id,title,price,currency,full_address,property_address,street_address,suburb,city,state,bedrooms,bathrooms,parking_spaces&street_address=not.is.null&order=created_at.desc&limit=10');
  const addrOf = (p) =>
    p.full_address || p.property_address ||
    [p.street_address, p.suburb || p.city, p.state].filter(Boolean).join(', ');
  const distinct = [];
  for (const p of candidates) {
    if (!distinct.some((d) => addrOf(d) === addrOf(p))) distinct.push(p);
    if (distinct.length === 2) break;
  }
  if (distinct.length < 2) throw new Error('Need 2 real properties with distinct addresses');
  const [propA, propB] = distinct;
  console.log(`Using real properties (read-only): A=${propA.id} (${addrOf(propA)}), B=${propB.id} (${addrOf(propB)})`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --- Login ---
  console.log('\nLogging in...');
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
  if (!adminId) throw new Error('No admin id');
  console.log('Admin user id:', adminId);

  // --- Seed household (engaged, search_active — well before offer_submitted) ---
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [household] = await svc('POST', 'clients', [{
    agent_id: adminId, household_name: 'TEST Suggestions Household', household_type: 'couple',
    lifecycle_stage: 'engaged', buying_stage: 'search_active',
    buying_stage_entered_at: new Date().toISOString(), client_status: 'active',
    next_action_date: fmtDate(nextWeek), next_action_type: 'Offer strategy call',
  }]);
  console.log('Seeded household:', household.id);
  const recordUrl = `${baseUrl}/clients/${household.id}`;

  // Link property A at candidate (service); we'll move it to offered via the UI
  const [cpA] = await svc('POST', 'client_properties', [{
    client_id: household.id, property_id: propA.id, agent_id: adminId, status: 'candidate',
  }]);
  console.log('Linked property A at candidate:', cpA.id);

  // --- 1. Baseline: no suggestion while nothing is offered/purchased ---
  await openRecord(page, recordUrl);
  console.log('\nBaseline suggestion on page (expect null):', await suggestionOnPage(page));
  await shot(page, '1-baseline-desktop.png');
  report('Baseline (desktop)', await contrastAudit(page));

  // --- 2. Move A → offered via the real UI (Properties tab status dialog) ---
  await page.click('#tab-properties');
  await sleep(800);
  await clickByAttr(page, 'data-cp-status-btn', addrOf(propA));
  await sleep(600);
  await page.click('#cp-status-opt-offered');
  await sleep(300);
  await page.click('#cp_status_save');
  await sleep(3000);

  // Suggestion should appear immediately (same page, post-loadAll)
  const s1 = await suggestionOnPage(page);
  console.log(`\nOffered suggestion appeared: ${s1} ${s1 === `offered:${cpA.id}` ? '✓' : '(MISMATCH!)'}`);
  await shot(page, '2-offered-suggestion-desktop.png');
  report('Offered suggestion (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '3-offered-suggestion-mobile.png');
  report('Offered suggestion (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Offered suggestion (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 3. Accept → buying_stage offer_submitted + timeline entry ---
  await page.click('#suggestion_accept');
  await sleep(3000);
  const [c1] = await svc('GET', `clients?id=eq.${household.id}&select=buying_stage,buying_stage_entered_at,lifecycle_stage`);
  console.log('DB after accept:', JSON.stringify(c1),
    c1.buying_stage === 'offer_submitted' ? '(buying_stage ✓)' : '(MISMATCH!)');
  let acts = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.buying_stage_changed&select=event_context&order=created_at.desc`);
  console.log('buying_stage_changed entries:', acts.length, JSON.stringify(acts[0]?.event_context),
    acts[0]?.event_context?.to === 'offer_submitted' ? '✓' : '(MISMATCH!)');
  console.log('Suggestion gone after accept (expect null):', await suggestionOnPage(page));
  await shot(page, '4-after-accept-offered-desktop.png');
  report('After accept (desktop)', await contrastAudit(page));

  // --- 4. Property B purchased (service link) → closed-won suggestion ---
  const [cpB] = await svc('POST', 'client_properties', [{
    client_id: household.id, property_id: propB.id, agent_id: adminId, status: 'purchased',
  }]);
  console.log('\nLinked property B at purchased:', cpB.id);
  await openRecord(page, recordUrl);
  const s2 = await suggestionOnPage(page);
  console.log(`Purchased suggestion appeared: ${s2} ${s2 === `purchased:${cpB.id}` ? '✓' : '(MISMATCH!)'}`);
  await shot(page, '5-purchased-suggestion-desktop.png');
  report('Purchased suggestion (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '6-purchased-suggestion-mobile.png');
  report('Purchased suggestion (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Purchased suggestion (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 5. Dismiss → gone; reload → back (session-only, no localStorage) ---
  await page.click('#suggestion_dismiss');
  await sleep(600);
  console.log('After dismiss (expect null):', await suggestionOnPage(page));
  await shot(page, '7-after-dismiss-desktop.png');
  const lsCheck = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.toLowerCase().includes('suggest') || k.toLowerCase().includes('dismiss')));
  console.log('localStorage suggestion keys (expect []):', JSON.stringify(lsCheck));
  await openRecord(page, recordUrl);
  console.log('After reload (expect suggestion back):', await suggestionOnPage(page));

  // --- 6. Accept purchased → under_contract + closed_won + 2 timeline rows ---
  await page.click('#suggestion_accept');
  await sleep(3500);
  const [c2] = await svc('GET', `clients?id=eq.${household.id}&select=lifecycle_stage,buying_stage,stage_entered_at,buying_stage_entered_at`);
  console.log('DB after purchased accept:', JSON.stringify(c2),
    c2.lifecycle_stage === 'closed_won' && c2.buying_stage === 'under_contract' ? '(both stages ✓)' : '(MISMATCH!)');
  const lcActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.lifecycle_stage_changed&select=event_context&order=created_at.desc`);
  acts = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.buying_stage_changed&select=event_context&order=created_at.desc`);
  console.log('lifecycle_stage_changed:', JSON.stringify(lcActs[0]?.event_context),
    lcActs[0]?.event_context?.to === 'closed_won' ? '✓' : '(MISMATCH!)');
  console.log('buying_stage_changed (latest):', JSON.stringify(acts[0]?.event_context),
    acts[0]?.event_context?.to === 'under_contract' ? '✓' : '(MISMATCH!)');
  console.log('Suggestion suppressed while closed (expect null):', await suggestionOnPage(page));
  await shot(page, '8-after-accept-purchased-desktop.png');
  report('After purchased accept (desktop)', await contrastAudit(page));

  // --- 7. closed_lost with reason via the stage dialog ---
  await page.click('#stage-badge-lifecycle');
  await sleep(600);
  await page.click('#stage-opt-closed_lost');
  await sleep(400);
  await page.type('#stage_reason', 'TEST reason: chose another agency after settlement delays.');
  await sleep(300);
  await shot(page, '9-closed-lost-reason-desktop.png');
  report('Closed-lost reason dialog (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '10-closed-lost-reason-mobile.png');
  report('Closed-lost reason dialog (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Closed-lost dialog (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);
  await page.click('#stage_save');
  await sleep(3000);

  const [c3] = await svc('GET', `clients?id=eq.${household.id}&select=lifecycle_stage,lost_reason`);
  console.log('\nDB after closed_lost:', JSON.stringify(c3),
    c3.lifecycle_stage === 'closed_lost' && (c3.lost_reason || '').startsWith('TEST reason') ? '(lost_reason ✓)' : '(MISMATCH!)');
  const lostActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.lifecycle_stage_changed&select=event_context&order=created_at.desc`);
  console.log('Timeline reason:', JSON.stringify(lostActs[0]?.event_context),
    (lostActs[0]?.event_context?.reason || '').startsWith('TEST reason') ? '✓' : '(MISMATCH!)');
  console.log('Suggestion suppressed while closed_lost (expect null):', await suggestionOnPage(page));

  // Timeline tab shows the reason
  await page.click('#tab-timeline');
  await sleep(1000);
  await shot(page, '11-timeline-with-reason-desktop.png');
  report('Timeline with reason (desktop)', await contrastAudit(page));
  const reasonShown = await page.evaluate(() => document.body.innerText.includes('chose another agency'));
  console.log('Reason visible on timeline:', reasonShown ? '✓' : '(MISSING!)');

  // --- Cleanup ---
  console.log('\nDeleting test data...');
  await svc('DELETE', `clients?id=eq.${household.id}`); // cascades links + activities

  console.log('\nFinal counts:');
  for (const t of ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities', 'client_properties']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)}`);
  }
  const [postMax] = await svc('GET', 'properties?select=updated_at&order=updated_at.desc&limit=1');
  console.log(`  properties: ${await svcCount('properties?select=id')} (expect ${prePropCount}), max updated_at ${postMax.updated_at === preMax.updated_at ? 'unchanged ✓' : 'CHANGED!'}`);

  await browser.close().catch(() => {});
  console.log(`\nTotal contrast failures across all audits: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — household: ${household.id}, client_properties A: ${cpA.id}, B: ${cpB.id}, real properties (untouched): ${propA.id}, ${propB.id}`);
  process.exit(0);
})();
