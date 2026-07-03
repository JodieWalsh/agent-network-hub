/**
 * CRM Client detail page verification.
 * Creates one test household through the real UI, opens its record, exercises
 * every tab (add member, add note, add + complete task), screenshots
 * desktop + 375px mobile, and runs the WCAG contrast audit throughout.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const screenshotDir = './screenshots/crm-client-detail';
fs.mkdirSync(screenshotDir, { recursive: true });

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
  await setReactValue(page, '#household_name', 'Vernon Household');
  await setReactValue(page, '#household_type', 'couple');
  await setReactValue(page, '#lead_source', 'Detail-page verification — safe to delete');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await setReactValue(page, '#next_action_date', tomorrow);
  await setReactValue(page, '#next_action_type', 'Book discovery call');
  await setReactValue(page, '#member_0_first', 'Vera');
  await setReactValue(page, '#member_0_last', 'Vernon');
  await setReactValue(page, '#member_0_email', 'vera@example.com');
  await setReactValue(page, '#member_0_phone', '0400 111 222');
  await setReactValue(page, '#member_0_role', 'partner');
  await page.click('#save_client');
  await pause(4000);
  console.log('Post-save URL:', page.url());

  // --- Open the record by clicking the list row ---
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2000);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Vernon Household'));
    if (btn) btn.click();
  });
  await pause(2500);
  const detailUrl = page.url();
  const clientId = detailUrl.split('/clients/')[1];
  console.log('Detail URL:', detailUrl);
  console.log('TEST CLIENT ID:', clientId);

  // --- Overview (desktop) ---
  console.log('\n=== OVERVIEW (DESKTOP) ===');
  await shot(page, 'detail-overview-desktop');
  report('overview (desktop)', await contrastAudit(page));

  // --- Members tab: add Victor with decision-maker flag ---
  console.log('\n=== MEMBERS TAB ===');
  await page.click('#tab-members');
  await pause(800);
  await shot(page, 'detail-members-initial');
  report('members tab', await contrastAudit(page));

  await page.click('#add_member_btn');
  await pause(600);
  await setReactValue(page, '#memberd_first', 'Victor');
  await setReactValue(page, '#memberd_last', 'Vernon');
  await setReactValue(page, '#memberd_email', 'victor@example.com');
  await setReactValue(page, '#memberd_role', 'partner');
  await page.click('#memberd_decision');
  await shot(page, 'detail-member-dialog');
  report('member dialog', await contrastAudit(page));
  await page.click('#memberd_save');
  await pause(2500);
  await shot(page, 'detail-members-after-add');
  console.log('Member added.');

  // --- Add a note via quick action ---
  console.log('\n=== ADD NOTE ===');
  await page.click('#qa-add-note');
  await pause(600);
  await setReactValue(page, '#note_body', 'Discovery call went well — both keen on Northern Beaches, budget firming up.');
  await page.click('#note_save');
  await pause(2000);
  console.log('Note added.');

  // --- Tasks tab: create, screenshot, complete ---
  console.log('\n=== TASKS TAB ===');
  await page.click('#tab-tasks');
  await pause(800);
  await page.click('#add_task_btn');
  await pause(600);
  await setReactValue(page, '#task_title', 'Chase finance pre-approval');
  await setReactValue(page, '#task_description', 'Vera to confirm broker timeline');
  await setReactValue(page, '#task_type', 'finance_check');
  await setReactValue(page, '#task_priority', 'high');
  const dueLocal = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
  await setReactValue(page, '#task_due', dueLocal);
  await shot(page, 'detail-task-dialog');
  report('task dialog', await contrastAudit(page));
  await page.click('#task_save');
  await pause(2500);
  await shot(page, 'detail-tasks-open');
  report('tasks tab (open task)', await contrastAudit(page));

  await page.click('[data-task-complete="Chase finance pre-approval"]');
  await pause(2500);
  await shot(page, 'detail-tasks-completed');
  report('tasks tab (completed)', await contrastAudit(page));
  console.log('Task created and completed.');

  // --- Timeline tab ---
  console.log('\n=== TIMELINE TAB ===');
  await page.click('#tab-timeline');
  await pause(800);
  await shot(page, 'detail-timeline');
  report('timeline tab', await contrastAudit(page));
  const timelineEvents = await page.evaluate(() =>
    [...document.querySelectorAll('ol li p:first-child')].map((p) => p.textContent)
  );
  console.log('Timeline events visible:', JSON.stringify(timelineEvents));

  // --- Mobile 375px ---
  console.log('\n=== MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(detailUrl, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await pause(2000);
  await shot(page, 'detail-overview-mobile');
  report('overview (mobile)', await contrastAudit(page));
  const hScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(hScroll.sw > hScroll.cw ? `HORIZONTAL SCROLL: ${JSON.stringify(hScroll)}` : 'No horizontal scroll on mobile.');
  await page.click('#tab-tasks');
  await pause(800);
  await shot(page, 'detail-tasks-mobile');
  report('tasks (mobile)', await contrastAudit(page));

  await browser.close().catch(() => {});
  console.log('\nDone. Screenshots in', screenshotDir);
  console.log('TEST CLIENT ID (for cleanup):', clientId);
  process.exit(0);
})();
