/**
 * CRM Properties tab verification — CRM Phase 3 (property pipeline).
 *
 * Uses REAL marketplace properties (read-only — none created or modified).
 * Seeds ONE test household, then drives the real UI: empty state → Add
 * Property modal (search real listings) → link with note → pipeline view
 * (multiple statuses incl. collapsed Passed) → duplicate-link guard →
 * status change → unlink. DB-checks client_properties + timeline after every
 * mutation. Desktop + 375px mobile (resize-in-place), WCAG contrast audits.
 * Cleanup: household + all links deleted; CRM tables at 0; properties table
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

const screenshotDir = './screenshots/properties-tab';
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
async function svcRaw(method, pathAndQuery, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method, headers: svcHeaders, body: body ? JSON.stringify(body) : undefined,
  });
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
function report(label, issues) {
  if (issues.length) {
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

async function openPropertiesTab(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const tab = await page.$('#tab-properties');
    if (tab && page.url().includes('/clients/')) {
      await page.click('#tab-properties');
      await sleep(800);
      if (page.url().includes('/clients/')) return;
    }
    console.log(`  (attempt ${attempt}: landed on ${page.url()}, retrying)`);
  }
  throw new Error('Could not open the Properties tab (kept redirecting)');
}

(async () => {
  // --- Pre-state ---
  const prePropCount = await svcCount('properties?select=id');
  const [preMax] = await svc('GET', 'properties?select=updated_at&order=updated_at.desc&limit=1');
  console.log(`Pre-existing: properties=${prePropCount}, max updated_at=${preMax.updated_at}`);
  console.log(`client_properties rows: ${await svcCount('client_properties?select=id')} (expect 0)`);

  // Two real properties with distinct addresses (read-only). Live rows use
  // street_address + city (full_address/property_address/suburb are null).
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
  // A distinctive word from A's street address to use as the search term
  const searchTerm = propA.street_address.split(' ').find((w) => w.length > 3) || propA.city;
  console.log(`Using real properties (read-only): A=${propA.id} (${addrOf(propA)}), B=${propB.id} (${addrOf(propB)})`);
  console.log(`Search term: "${searchTerm}"`);

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

  // --- Seed household ---
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [household] = await svc('POST', 'clients', [{
    agent_id: adminId, household_name: 'TEST Pipeline Household', household_type: 'couple',
    lifecycle_stage: 'engaged', client_status: 'active',
    next_action_date: fmtDate(nextWeek), next_action_type: 'Shortlist review',
  }]);
  console.log('Seeded household:', household.id);
  const recordUrl = `${baseUrl}/clients/${household.id}`;

  // --- 1. Empty state ---
  await openPropertiesTab(page, recordUrl);
  await shot(page, '1-empty-desktop.png');
  report('Empty (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '2-empty-mobile.png');
  report('Empty (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Empty (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 2. Add Property modal: search real listings ---
  await page.click('#add_property_btn');
  await sleep(500);
  await page.type('#prop_search_input', searchTerm);
  await page.click('#prop_search_btn');
  await sleep(2000);
  await shot(page, '3-add-modal-desktop.png');
  report('Add modal (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '4-add-modal-mobile.png');
  report('Add modal (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Add modal (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 3. Link property A with a note (via UI) ---
  await clickByAttr(page, 'data-prop-result', addrOf(propA));
  await sleep(400);
  await page.type('#prop_note', 'TEST note: great school catchment fit.');
  await page.click('#link_property_save');
  await sleep(3000);

  const [cpA] = await svc('GET', `client_properties?client_id=eq.${household.id}&property_id=eq.${propA.id}&select=id,status,status_entered_at,notes`);
  console.log('\nDB after link:', JSON.stringify(cpA));
  const linkActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.property_linked&select=event_context`);
  console.log('property_linked timeline entries:', linkActs.length, JSON.stringify(linkActs[0]?.event_context));

  // --- 4. Service-link property B at 'offered', then move it to 'passed'
  //        (visual variety: two pipeline groups + the collapsed Passed section) ---
  const [cpB] = await svc('POST', 'client_properties', [{
    client_id: household.id, property_id: propB.id, agent_id: adminId, status: 'offered',
  }]);
  console.log('Service-linked property B:', cpB.id, '(status offered)');

  // Duplicate-link guard: DB unique constraint (service level)
  const dup = await svcRaw('POST', 'client_properties', [{
    client_id: household.id, property_id: propA.id, agent_id: adminId, status: 'candidate',
  }]);
  console.log(`Duplicate insert blocked by DB: status ${dup.status} (expect 409)`);

  // --- 5. Pipeline view with two groups ---
  await openPropertiesTab(page, recordUrl);
  await sleep(1000);
  await shot(page, '5-pipeline-desktop.png');
  report('Pipeline (desktop)', await contrastAudit(page));

  // Duplicate-link guard at UI level: propA shows "Linked" chip, disabled
  await page.click('#add_property_btn');
  await sleep(400);
  await page.type('#prop_search_input', searchTerm);
  await page.click('#prop_search_btn');
  await sleep(2000);
  const dupUi = await page.evaluate((addr) => {
    const el = [...document.querySelectorAll('[data-prop-result]')].find((b) => b.getAttribute('data-prop-result') === addr);
    return el ? { disabled: el.disabled, text: el.textContent.includes('Linked') } : null;
  }, addrOf(propA));
  console.log('UI duplicate guard (disabled + "Linked" chip):', JSON.stringify(dupUi));
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('[aria-label="Close dialog"]')?.click());
  await sleep(500);

  // --- 6. Status change via UI: A candidate → due_diligence ---
  await clickByAttr(page, 'data-cp-status-btn', addrOf(propA));
  await sleep(600);
  await shot(page, '6-status-picker-desktop.png');
  report('Status picker (desktop)', await contrastAudit(page));
  await page.click('#cp-status-opt-due_diligence');
  await sleep(300);
  await page.click('#cp_status_save');
  await sleep(3000);

  const [cpA2] = await svc('GET', `client_properties?id=eq.${cpA.id}&select=status,status_entered_at`);
  console.log('\nDB after status change:', JSON.stringify(cpA2),
    cpA2.status === 'due_diligence' && cpA2.status_entered_at > cpA.status_entered_at ? '(status + entered_at reset ✓)' : '(MISMATCH!)');
  const statusActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.property_status_changed&select=event_context`);
  console.log('property_status_changed entries:', statusActs.length, JSON.stringify(statusActs[0]?.event_context));

  // Move B to passed (service) for the collapsed section, reload
  await svc('PATCH', `client_properties?id=eq.${cpB.id}`, { status: 'passed', status_entered_at: new Date().toISOString() });
  await openPropertiesTab(page, recordUrl);
  await sleep(800);
  await page.click('#passed_toggle');
  await sleep(500);
  await shot(page, '7-pipeline-with-passed-desktop.png');
  report('Pipeline + passed open (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '8-pipeline-mobile.png');
  report('Pipeline (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Pipeline (mobile)');

  // --- 7. Unlink A via UI (confirm dialog: mobile then desktop shot) ---
  await clickByAttr(page, 'data-cp-unlink', addrOf(propA));
  await sleep(600);
  await shot(page, '9-unlink-confirm-mobile.png');
  report('Unlink confirm (mobile)', await contrastAudit(page));
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(600);
  await shot(page, '10-unlink-confirm-desktop.png');
  report('Unlink confirm (desktop)', await contrastAudit(page));
  await page.click('#unlink_property_confirm');
  await sleep(3000);

  const gone = await svcCount(`client_properties?id=eq.${cpA.id}&select=id`);
  console.log('\nDB after unlink: row remaining =', gone, gone === 0 ? '(deleted ✓)' : '(MISMATCH!)');
  const unlinkActs = await svc('GET', `client_activities?client_id=eq.${household.id}&event_type=eq.property_unlinked&select=event_context`);
  console.log('property_unlinked entries:', unlinkActs.length, JSON.stringify(unlinkActs[0]?.event_context));

  // --- Cleanup ---
  console.log('\nDeleting test data...');
  await svc('DELETE', `clients?id=eq.${household.id}`); // cascades client_properties link B + activities

  console.log('\nFinal counts:');
  for (const t of ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities', 'client_properties']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)}`);
  }
  const [postMax] = await svc('GET', 'properties?select=updated_at&order=updated_at.desc&limit=1');
  console.log(`  properties: ${await svcCount('properties?select=id')} (expect ${prePropCount}), max updated_at ${postMax.updated_at === preMax.updated_at ? 'unchanged ✓' : 'CHANGED!'}`);
  console.log(`  client_briefs: ${await svcCount('client_briefs?select=id')} (expect 4)`);

  await browser.close().catch(() => {});
  console.log('\nDone. Screenshots in', screenshotDir);
  process.exit(0);
})();
