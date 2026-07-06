/**
 * CRM Inspections tab verification — CRM Phase 3 (read-only inspections).
 *
 * Seeds ONE test household + ONE test brief; screenshots the Inspections tab
 * with NO brief linked, then links the brief (service PATCH — the linking UI
 * was verified separately) and screenshots the "no inspections yet" state,
 * then seeds ONE test inspection_job against the brief and confirms it
 * renders. Attempts a minimal test report to prove the "View report" link.
 * Desktop + 375px mobile, WCAG contrast audits throughout. Finally deletes
 * ALL test data and confirms: 5 CRM tables at 0 rows, client_briefs back to
 * its pre-count, no orphan test job/report.
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
  console.error('Missing env'); process.exit(1);
}

const screenshotDir = './screenshots/inspections-tab';
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
    method: 'HEAD',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, Prefer: 'count=exact' },
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

async function openInspectionsTab(page, url) {
  // Auth hydration can bounce a hard load of a protected route back to "/"
  // moments after render; verify we're still on the record after clicking.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const tab = await page.$('#tab-inspections');
    if (tab && page.url().includes('/clients/')) {
      await page.click('#tab-inspections');
      await sleep(800);
      if (page.url().includes('/clients/')) return;
    }
    console.log(`  (attempt ${attempt}: landed on ${page.url()}, retrying)`);
  }
  throw new Error('Could not open the Inspections tab (kept redirecting)');
}

(async () => {
  const preBriefCount = await svcCount('client_briefs?select=id');
  const preJobCount = await svcCount('inspection_jobs?select=id');
  console.log(`Pre-existing: client_briefs=${preBriefCount}, inspection_jobs=${preJobCount}`);

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
  if (!adminId) throw new Error('No admin id');
  console.log('Admin user id:', adminId);

  // --- Seed household + (unlinked) brief ---
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [household] = await svc('POST', 'clients', [{
    agent_id: adminId, household_name: 'TEST Inspection Household', household_type: 'family',
    lifecycle_stage: 'engaged', client_status: 'active',
    next_action_date: fmtDate(nextWeek), next_action_type: 'Review inspections',
  }]);
  const [testBrief] = await svc('POST', 'client_briefs', [{
    agent_id: adminId, client_name: 'TEST Insp Client', brief_name: 'TEST Harbour Brief',
    status: 'active', budget_min: 1500000, budget_max: 2000000,
    location_summary: 'Lower North Shore, Sydney',
  }]);
  console.log('Seeded household:', household.id);
  console.log('Seeded brief:    ', testBrief.id);
  const recordUrl = `${baseUrl}/clients/${household.id}`;

  // --- 1. Inspections tab, NO brief linked ---
  await openInspectionsTab(page, recordUrl);
  await shot(page, '1-no-brief-desktop.png');
  report('No brief (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(600);
  await shot(page, '2-no-brief-mobile.png');
  report('No brief (mobile)', await contrastAudit(page));
  await noHScroll(page, 'No brief (mobile)');

  // --- Link the brief (service PATCH; the linking UI was verified earlier) ---
  await svc('PATCH', `client_briefs?id=eq.${testBrief.id}`, { client_id: household.id });
  console.log('\nBrief linked to household (service PATCH).');

  // --- 2. Brief linked, no inspections yet ---
  await page.setViewport({ width: 1440, height: 900 });
  await openInspectionsTab(page, recordUrl);
  await shot(page, '3-linked-no-jobs-desktop.png');
  report('Linked, no jobs (desktop)', await contrastAudit(page));

  // --- Seed one inspection job against the brief ---
  const [job] = await svc('POST', 'inspection_jobs', [{
    requesting_agent_id: adminId,
    creator_id: adminId,
    client_brief_id: testBrief.id,
    title: 'TEST Pre-purchase inspection',
    description: 'TEST seed for CRM inspections tab verification.',
    property_address: '42 Harbourview Parade, Cremorne NSW',
    status: 'open',
    budget_min: 450,
    budget_max: 650,
    budget_currency: 'AUD',
  }]);
  console.log('Seeded inspection job:', job.id);

  // Try a minimal report so the "View report" link renders (best-effort).
  let reportId = null;
  try {
    const [rep] = await svc('POST', 'inspection_reports', [{
      job_id: job.id, inspector_id: adminId,
    }]);
    reportId = rep.id;
    console.log('Seeded minimal report:', reportId);
  } catch (e) {
    console.log('Report seed skipped (schema requires more fields):', e.message.slice(0, 160));
  }

  // --- 3. Inspections tab with the job showing ---
  await openInspectionsTab(page, recordUrl);
  await shot(page, '4-with-job-desktop.png');
  report('With job (desktop)', await contrastAudit(page));
  const rendered = await page.evaluate(() => {
    const row = document.querySelector('[data-job-row]');
    return row ? row.textContent : null;
  });
  console.log('Rendered job row:', rendered ? rendered.slice(0, 220) : 'NOT FOUND!');

  // Resize in place rather than hard-reloading: repeated hard loads of a
  // protected route can lose the app's 1s auth-hydration race and bounce
  // to "/" (pre-existing ProtectedRoute behaviour, not a CRM issue).
  await page.setViewport({ width: 375, height: 812 });
  await sleep(1200);
  await shot(page, '5-with-job-mobile.png');
  report('With job (mobile)', await contrastAudit(page));
  await noHScroll(page, 'With job (mobile)');

  // --- Cleanup (report → job → household → brief) ---
  console.log('\nDeleting test data...');
  if (reportId) await svc('DELETE', `inspection_reports?id=eq.${reportId}`);
  await svc('DELETE', `inspection_jobs?id=eq.${job.id}`);
  await svc('DELETE', `clients?id=eq.${household.id}`);
  await svc('DELETE', `client_briefs?id=eq.${testBrief.id}`);

  console.log('\nFinal counts:');
  for (const t of ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)}`);
  }
  console.log(`  client_briefs total: ${await svcCount('client_briefs?select=id')} (expect ${preBriefCount})`);
  console.log(`  inspection_jobs total: ${await svcCount('inspection_jobs?select=id')} (expect ${preJobCount})`);
  console.log(`  test job remaining: ${await svcCount(`inspection_jobs?id=eq.${job.id}&select=id`)} (expect 0)`);
  console.log(`  jobs with TEST title: ${await svcCount('inspection_jobs?title=ilike.*TEST*&select=id')} (expect 0)`);

  await browser.close().catch(() => {});
  console.log('\nDone. Screenshots in', screenshotDir);
  process.exit(0);
})();
