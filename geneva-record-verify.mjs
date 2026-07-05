/**
 * Geneva Phase 2 verification — the contact RECORD page.
 *
 * Drives the real UI as the seeded admin:
 *   1. List row click opens the RECORD (not edit); overview renders
 *   2. Add note → geneva_notes row + 'note_added' activity
 *   3. Add task → 'task_created'; complete it → completed_at + 'task_completed'
 *      (a second, service-seeded overdue task shows the gentle Overdue chip)
 *   4. Stage → Engaged; then Inactive REQUIRING a reason → inactive_reason
 *      saved + both 'stage_changed' entries (reason in context)
 *   5. Timeline shows the full story; screenshots desktop + 375px mobile
 *   6. Non-admin (temp auth user, incognito) blocked from the record route
 * Cleanup: all four geneva_* tables back to 0 rows; temp user deleted.
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const screenshotDir = './screenshots/geneva-record';
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
const mobileShot = async (page, name, label) => {
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await shot(page, name);
  report(label, await contrastAudit(page));
  await noHScroll(page, label);
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);
};

async function login(page, email, password) {
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', email);
  await page.type('#password', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await sleep(3000);
}

(async () => {
  // --- Pre-state ---
  console.log('Pre-state:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  const preProfiles = await svcCount('profiles?select=id');
  console.log(`  profiles: ${preProfiles}`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\nLogging in as admin...');
  await login(page, EMAIL, PASSWORD);
  const adminId = await page.evaluate((projectId) => {
    const raw = localStorage.getItem(`sb-${projectId}-auth-token`);
    return raw ? JSON.parse(raw)?.user?.id ?? null : null;
  }, process.env.VITE_SUPABASE_PROJECT_ID);
  if (!adminId) throw new Error('No admin id');

  // --- Seed ONE contact (with the contact_created entry the form writes) ---
  const [contact] = await svc('POST', 'geneva_contacts', [{
    first_name: 'TEST Harper', last_name: 'Record', email: 'test.geneva.record@example.com',
    phone: '0400 111 222', company: 'Record Realty', professional_type: 'buyers_agent',
    region_city: 'Melbourne', lifecycle_stage: 'new', owner_id: adminId,
    original_source: 'instagram', source_detail: 'DM after the offer-strategy reel',
    email_consent_status: 'subscribed', notes: 'TEST contact for record verify.',
    created_by: adminId,
  }]);
  await svc('POST', 'geneva_activities', [{
    contact_id: contact.id, actor_user_id: adminId, event_type: 'contact_created',
    event_context: { professional_type: 'buyers_agent', original_source: 'instagram' },
  }]);
  // A service-seeded OVERDUE task so the gentle chip is visible
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  await svc('POST', 'geneva_tasks', [{
    contact_id: contact.id, title: 'TEST overdue nudge', owner_id: adminId,
    due_at: yesterday, priority: 'medium', status: 'open', created_by: adminId,
  }]);
  console.log('Seeded contact:', contact.id);
  const recordUrl = `${baseUrl}/geneva/contacts/${contact.id}`;

  // --- 1. List row click opens the RECORD ---
  await page.goto(`${baseUrl}/geneva/contacts`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(() => {
    const row = document.querySelector('[data-contact-row="test.geneva.record@example.com"]');
    if (!row) throw new Error('Row not found');
    row.click();
  });
  await sleep(2500);
  console.log('\nRow click landed on:', page.url(),
    page.url().endsWith(`/geneva/contacts/${contact.id}`) ? '(record, not edit ✓)' : '(WRONG!)');
  await shot(page, '1-overview-desktop.png');
  report('Overview (desktop)', await contrastAudit(page));
  await mobileShot(page, '2-overview-mobile.png', 'Overview (mobile)');

  // --- 2. Notes: add via dialog ---
  await page.click('#qa-add-note');
  await sleep(600);
  await page.type('#gnote_body', 'TEST note: called Harper — keen on the founding cohort, wants pricing.');
  await shot(page, '3-add-note-dialog-desktop.png');
  report('Add-note dialog (desktop)', await contrastAudit(page));
  await page.click('#gnote_save');
  await sleep(2500);
  const noteRows = await svc('GET', `geneva_notes?contact_id=eq.${contact.id}&select=id,body,created_by`);
  const noteActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.note_added&select=event_context`);
  console.log('\nNote row:', noteRows.length, noteRows[0]?.body.startsWith('TEST note') ? '✓' : '(MISMATCH!)');
  console.log('note_added activity:', noteActs.length, JSON.stringify(noteActs[0]?.event_context), noteActs.length === 1 ? '✓' : '(MISMATCH!)');
  await page.click('#gtab-notes');
  await sleep(800);
  await shot(page, '4-notes-tab-desktop.png');
  report('Notes tab (desktop)', await contrastAudit(page));

  // --- 3. Tasks: add via dialog, then complete ---
  await page.click('#qa-add-task');
  await sleep(600);
  await page.type('#gtask_title', 'TEST send early-access invite');
  await page.type('#gtask_description', 'Include the founding-cohort pricing PDF.');
  const nextWeekLocal = new Date(Date.now() + 7 * 86400000);
  const dtLocal = `${nextWeekLocal.getFullYear()}-${String(nextWeekLocal.getMonth() + 1).padStart(2, '0')}-${String(nextWeekLocal.getDate()).padStart(2, '0')}T10:00`;
  await page.type('#gtask_due', dtLocal).catch(async () => {
    await page.evaluate((v) => {
      const el = document.querySelector('#gtask_due');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, dtLocal);
  });
  await page.select('#gtask_priority', 'high');
  await shot(page, '5-add-task-dialog-desktop.png');
  report('Add-task dialog (desktop)', await contrastAudit(page));
  await page.click('#gtask_save');
  await sleep(2500);
  const taskRows = await svc('GET', `geneva_tasks?contact_id=eq.${contact.id}&title=eq.${encodeURIComponent('TEST send early-access invite')}&select=id,status,priority,owner_id`);
  const taskActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.task_created&select=event_context`);
  console.log('\nTask row:', JSON.stringify(taskRows[0]), taskRows[0]?.status === 'open' && taskRows[0]?.priority === 'high' ? '✓' : '(MISMATCH!)');
  console.log('task_created activity:', taskActs.length, JSON.stringify(taskActs[0]?.event_context), taskActs.length === 1 ? '✓' : '(MISMATCH!)');

  await page.click('#gtab-tasks');
  await sleep(800);
  const overdueChip = await page.evaluate(() => !!document.querySelector('[data-overdue="TEST overdue nudge"]'));
  console.log('Overdue chip on seeded task:', overdueChip ? '✓' : '(MISSING!)');
  await shot(page, '6-tasks-tab-desktop.png');
  report('Tasks tab (desktop)', await contrastAudit(page));
  await mobileShot(page, '7-tasks-tab-mobile.png', 'Tasks tab (mobile)');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-task-complete]')]
      .find((b) => b.getAttribute('data-task-complete') === 'TEST send early-access invite');
    if (!btn) throw new Error('Complete button not found');
    btn.click();
  });
  await sleep(2500);
  const [doneTask] = await svc('GET', `geneva_tasks?id=eq.${taskRows[0].id}&select=status,completed_at`);
  const doneActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.task_completed&select=event_context`);
  console.log('After complete:', JSON.stringify(doneTask),
    doneTask.status === 'completed' && doneTask.completed_at ? '✓' : '(MISMATCH!)');
  console.log('task_completed activity:', doneActs.length, JSON.stringify(doneActs[0]?.event_context), doneActs.length === 1 ? '✓' : '(MISMATCH!)');

  // --- 4. Stage: → Engaged, then → Inactive with required reason ---
  await page.click('#stage-badge');
  await sleep(600);
  await page.click('#gstage-opt-engaged');
  await sleep(300);
  await shot(page, '8-stage-dialog-desktop.png');
  report('Stage dialog (desktop)', await contrastAudit(page));
  await page.click('#gstage_save');
  await sleep(2500);

  await page.click('#stage-badge');
  await sleep(600);
  await page.click('#gstage-opt-inactive');
  await sleep(400);
  const saveDisabledNoReason = await page.evaluate(() => document.querySelector('#gstage_save')?.disabled);
  console.log('\nInactive without reason — save disabled:', saveDisabledNoReason ? '✓' : '(NOT ENFORCED!)');
  await page.select('#gstage_reason', 'not_ready_yet');
  await sleep(300);
  await shot(page, '9-stage-inactive-reason-desktop.png');
  report('Inactive-reason dialog (desktop)', await contrastAudit(page));
  await mobileShot(page, '10-stage-inactive-reason-mobile.png', 'Inactive-reason dialog (mobile)');
  await page.click('#gstage_save');
  await sleep(2500);

  const [afterStage] = await svc('GET', `geneva_contacts?id=eq.${contact.id}&select=lifecycle_stage,inactive_reason`);
  const stageActs = await svc('GET', `geneva_activities?contact_id=eq.${contact.id}&event_type=eq.stage_changed&select=event_context&order=created_at.asc`);
  console.log('After stage changes:', JSON.stringify(afterStage),
    afterStage.lifecycle_stage === 'inactive' && afterStage.inactive_reason === 'not_ready_yet' ? '✓' : '(MISMATCH!)');
  console.log('stage_changed entries:', stageActs.length, JSON.stringify(stageActs.map((a) => a.event_context)),
    stageActs.length === 2 && stageActs[1]?.event_context?.reason === 'not_ready_yet' ? '✓' : '(MISMATCH!)');

  // --- 5. Timeline ---
  await page.click('#gtab-timeline');
  await sleep(800);
  await shot(page, '11-timeline-desktop.png');
  report('Timeline (desktop)', await contrastAudit(page));
  await mobileShot(page, '12-timeline-mobile.png', 'Timeline (mobile)');
  const timelineText = await page.evaluate(() => document.body.innerText);
  for (const expect of ['Contact created', 'Note added', 'Task created', 'Task completed', 'Stage changed', 'Not ready yet']) {
    console.log(`Timeline shows "${expect}":`, timelineText.includes(expect) ? '✓' : '(MISSING!)');
  }

  // --- 6. Non-admin blocked from the record route ---
  console.log('\nCreating temp non-admin auth user...');
  const tmpRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test.nonadmin.geneva2@example.com',
      password: 'TempNonAdmin123!',
      email_confirm: true,
      user_metadata: { full_name: 'TEST NonAdmin2', user_type: 'buyers_agent' },
    }),
  });
  const tmpUser = await tmpRes.json();
  console.log('Temp user:', tmpRes.status, tmpUser.id);
  const ctx = await (browser.createBrowserContext
    ? browser.createBrowserContext()
    : browser.createIncognitoBrowserContext());
  const page2 = await ctx.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await login(page2, 'test.nonadmin.geneva2@example.com', 'TempNonAdmin123!');
  await page2.goto(recordUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(2500);
  const blockedText = await page2.evaluate(() => document.body.innerText);
  const denied = blockedText.includes('Access Denied');
  console.log('Non-admin at record URL:', denied ? 'Access Denied ✓' : (!page2.url().includes('/geneva') ? `redirected ✓` : 'REACHED — FAIL!'));
  console.log('Non-admin sees contact data:', blockedText.includes('TEST Harper') ? 'LEAKED — FAIL!' : 'no ✓');
  await page2.close();

  // --- Cleanup ---
  console.log('\nCleaning up test data...');
  await svc('DELETE', `geneva_contacts?id=eq.${contact.id}`); // cascades notes/tasks/activities
  const delUser = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${tmpUser.id}`, {
    method: 'DELETE', headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
  console.log('Temp auth user deleted:', delUser.status);
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${tmpUser.id}`, { method: 'DELETE', headers: svcHeaders });

  console.log('\nFinal counts:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  console.log(`  profiles: ${await svcCount('profiles?select=id')} (expect ${preProfiles})`);

  console.log(`\nTotal contrast failures across all audits: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — geneva contact: ${contact.id}, temp non-admin auth user: ${tmpUser.id}`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
