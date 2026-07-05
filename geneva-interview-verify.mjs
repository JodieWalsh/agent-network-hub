/**
 * Interview Funnel piece 3 verification — the 7-step interview stages.
 *
 * Proves against the live UI + demo data (demo untouched):
 *   1. Outreach contact created via the form starts at 'to_contact'
 *      (+ entered_at); record leads with the interview badge, lifecycle
 *      badge hidden, days-in-stage shown
 *   2. Stage picker (9 numbered steps + 2 exits) moves stages; every move
 *      timeline-logged (interview_stage_changed {from,to})
 *   3. Task suggestions appear on trigger stages, are dismissible, and
 *      "Add task" pre-fills the normal dialog (admin still clicks Create)
 *   4. declined_kept_on_list shows the consent-wall note
 *   5. List: outreach rows show the interview badge; WAITLIST demo rows
 *      are pixel-identical (lifecycle badge, no interview UI anywhere)
 *   6. Non-admin blocked; all geneva_* counts restored exactly
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';
const T_EMAIL = 'test.interview.journey@stage-test.example';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const screenshotDir = './screenshots/geneva-interview';
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
  const pre = {};
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    pre[t] = await svcCount(`${t}?select=id`);
  }
  console.log('Pre-state:', JSON.stringify(pre));

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);

  // --- 1. Create outreach contact via the form → starts at to_contact ---
  await page.goto(`${baseUrl}/geneva/contacts/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.type('#gc_first_name', 'TEST InterviewJourney');
  await page.type('#gc_email', T_EMAIL);
  await page.select('#gc_contact_type', 'interview_outreach');
  await page.click('#gc_save');
  await sleep(3000);
  const [c] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(T_EMAIL)}&select=id,interview_stage,interview_stage_entered_at,contact_type`);
  console.log('\n1. Created via form:', JSON.stringify(c),
    c.interview_stage === 'to_contact' && c.interview_stage_entered_at ? '✓ (starts at to_contact)' : 'FAIL');

  // Record: interview badge leads, lifecycle hidden, days shown
  await page.goto(`${baseUrl}/geneva/contacts/${c.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const recordState = await page.evaluate(() => ({
    interviewBadge: document.querySelector('#interview-stage-badge')?.textContent ?? null,
    lifecycleBadge: !!document.querySelector('#stage-badge'),
    days: document.querySelector('[data-interview-days]')?.textContent ?? null,
  }));
  console.log('2. Record state:', JSON.stringify(recordState),
    recordState.interviewBadge?.includes('To Contact') && !recordState.lifecycleBadge && recordState.days?.includes('0 days')
      ? '✓ (interview leads, lifecycle hidden)' : 'FAIL');
  await shot(page, '1-record-tocontact-desktop.png');
  report('Record at To Contact (desktop)', await contrastAudit(page));

  // --- 2. Stage picker → interview_booked; timeline logged ---
  await page.click('#interview-stage-badge');
  await sleep(600);
  const dialogSteps = await page.evaluate(() => document.querySelectorAll('[id^="istage-opt-"]').length);
  console.log('\n3. Picker options rendered:', dialogSteps, dialogSteps === 11 ? '✓ (9 steps + 2 exits)' : 'FAIL');
  await shot(page, '2-stage-picker-desktop.png');
  report('Stage picker (desktop)', await contrastAudit(page));
  await page.click('#istage-opt-interview_booked');
  await sleep(300);
  await page.click('#istage_save');
  await sleep(2500);
  const [afterBook] = await svc('GET', `geneva_contacts?id=eq.${c.id}&select=interview_stage,interview_stage_entered_at`);
  const acts1 = await svc('GET', `geneva_activities?contact_id=eq.${c.id}&event_type=eq.interview_stage_changed&select=event_context&order=created_at.desc`);
  console.log('4. After move:', JSON.stringify(afterBook), '| activity:', JSON.stringify(acts1[0]?.event_context),
    afterBook.interview_stage === 'interview_booked' && acts1[0]?.event_context?.to === 'interview_booked' ? '✓' : 'FAIL');

  // --- 3. Suggestion banner: appears → dismiss → reappears via accept path ---
  const sugg1 = await page.evaluate(() => document.querySelector('[data-task-suggestion]')?.getAttribute('data-task-suggestion'));
  console.log('\n5a. Suggestion after booking:', sugg1, sugg1 === 'interview_booked' ? '✓' : 'FAIL');
  await shot(page, '3-suggestion-banner-desktop.png');
  report('Suggestion banner (desktop)', await contrastAudit(page));
  await page.click('#suggestion_dismiss');
  await sleep(500);
  const sugg2 = await page.evaluate(() => !!document.querySelector('[data-task-suggestion]'));
  console.log('5b. Dismiss hides it:', !sugg2 ? '✓' : 'FAIL');
  // Move to questions_sent → new suggestion → Accept pre-fills task dialog
  await page.click('#interview-stage-badge');
  await sleep(600);
  await page.click('#istage-opt-questions_sent');
  await page.click('#istage_save');
  await sleep(2500);
  const sugg3 = await page.evaluate(() => document.querySelector('[data-task-suggestion]')?.getAttribute('data-task-suggestion'));
  console.log('5c. New suggestion at questions_sent:', sugg3, sugg3 === 'questions_sent' ? '✓' : 'FAIL');
  await page.click('#suggestion_add_task');
  await sleep(600);
  const prefilled = await page.evaluate(() => document.querySelector('#gtask_title')?.value ?? null);
  console.log('5d. Task dialog pre-filled:', JSON.stringify(prefilled),
    prefilled?.includes('reminder text') ? '✓ (admin still clicks Create)' : 'FAIL');
  await shot(page, '4-task-prefilled-desktop.png');
  await page.click('#gtask_save');
  await sleep(2500);
  const tasks = await svc('GET', `geneva_tasks?contact_id=eq.${c.id}&select=title,status`);
  console.log('5e. Task created:', JSON.stringify(tasks), tasks.length === 1 ? '✓' : 'FAIL');

  // --- 4. declined_kept_on_list → consent-wall note ---
  await page.click('#interview-stage-badge');
  await sleep(600);
  await page.click('#istage-opt-declined_kept_on_list');
  await page.click('#istage_save');
  await sleep(2500);
  const keptNote = await page.evaluate(() => !!document.querySelector('[data-kept-on-list-note]'));
  console.log('\n6. Kept-on-list consent note:', keptNote ? '✓' : 'FAIL');
  await shot(page, '5-kept-on-list-desktop.png');
  report('Kept-on-list (desktop)', await contrastAudit(page));
  const allMoves = await svc('GET', `geneva_activities?contact_id=eq.${c.id}&event_type=eq.interview_stage_changed&select=event_context&order=created_at.asc`);
  console.log('7. Timeline logged all moves:', allMoves.length, JSON.stringify(allMoves.map((a) => a.event_context.to)),
    allMoves.length === 3 ? '✓' : 'FAIL');

  // --- 5. List: interview badge for outreach; demo waitlist rows unchanged ---
  await page.goto(`${baseUrl}/geneva/contacts`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const listState = await page.evaluate((tEmail) => {
    const outreachBadge = document.querySelector(`[data-interview-badge="${tEmail}"]`)?.textContent ?? null;
    // Ava Pemberton = demo waitlist row: must show lifecycle "New", no interview badge
    const avaRow = document.querySelector('[data-contact-row="ava.pemberton@geneva-demo.example"]');
    return {
      outreachBadge,
      avaHasInterviewBadge: !!avaRow?.querySelector('[data-interview-badge]'),
      avaText: avaRow?.innerText.includes('New') ?? false,
    };
  }, T_EMAIL);
  console.log('\n8. List:', JSON.stringify(listState),
    listState.outreachBadge?.includes('Declined') && !listState.avaHasInterviewBadge && listState.avaText
      ? '✓ (outreach badge; waitlist rows identical)' : 'FAIL');
  await shot(page, '6-list-desktop.png');
  report('List (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, '7-list-mobile.png');
  report('List (mobile)', await contrastAudit(page));
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? 'Mobile h-scroll: FAIL' : 'Mobile: no horizontal scrolling.');
  await page.setViewport({ width: 1440, height: 900 });

  // Waitlist record pixel-logic check: demo contact shows lifecycle badge, no interview UI
  const [ava] = await svc('GET', `geneva_contacts?email=eq.ava.pemberton%40geneva-demo.example&select=id`);
  await page.goto(`${baseUrl}/geneva/contacts/${ava.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const avaRecord = await page.evaluate(() => ({
    lifecycleBadge: !!document.querySelector('#stage-badge'),
    interviewBadge: !!document.querySelector('#interview-stage-badge'),
    days: !!document.querySelector('[data-interview-days]'),
  }));
  console.log('9. Waitlist record unaffected:', JSON.stringify(avaRecord),
    avaRecord.lifecycleBadge && !avaRecord.interviewBadge && !avaRecord.days ? '✓' : 'FAIL');

  // --- 6. Non-admin blocked ---
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.nonadmin.interview@example.com', password: 'TempNonAdmin123!', email_confirm: true, user_metadata: { full_name: 'TEST NonAdmin7', user_type: 'buyers_agent' } }),
  });
  const tmpUser = await tmpRes.json();
  const ctx = await (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
  const p2 = await ctx.newPage();
  await p2.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await p2.waitForSelector('#email', { timeout: 15000 });
  await p2.type('#email', 'test.nonadmin.interview@example.com');
  await p2.type('#password', 'TempNonAdmin123!');
  await Promise.all([
    p2.click('button[type="submit"]'),
    p2.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
  await p2.goto(`${baseUrl}/geneva/contacts/${c.id}`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2000);
  const t2 = await p2.evaluate(() => document.body.innerText);
  console.log('\n10. Non-admin at record:', t2.includes('Access Denied') || !p2.url().includes('/geneva') ? 'blocked ✓' : 'FAIL!');
  await p2.close();
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, { method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` } });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });

  // --- Cleanup ---
  await svc('DELETE', `geneva_contacts?id=eq.${c.id}`); // cascades task + activities
  console.log('\nPost-state (must equal pre):');
  let intact = true;
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    const n = await svcCount(`${t}?select=id`);
    if (n !== pre[t]) intact = false;
    console.log(`  ${t}: ${n} (was ${pre[t]}) ${n === pre[t] ? '✓' : 'FAIL!'}`);
  }
  console.log(`Demo intact: ${intact ? 'YES ✓' : 'NO — INVESTIGATE'}`);
  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — contact: ${c.id}, temp non-admin: ${tmpUser.id} (both deleted)`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
