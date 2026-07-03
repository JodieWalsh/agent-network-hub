/**
 * CRM Snapshot (dashboard widgets) verification script — CRM Phase 2.
 *
 * 1. Logs in as the seeded admin, audits the dashboard EMPTY state
 *    (desktop + 375px mobile, WCAG contrast, no horizontal scroll).
 * 2. Seeds 3 test clients + 1 task due today (service key, agent_id = admin)
 *    so the widgets show real numbers, and re-audits.
 * 3. Deletes the seeded rows and confirms all 5 CRM tables are back to 0 rows.
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
if (!SUPABASE_URL || !SECRET) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const screenshotDir = './screenshots/crm-snapshot';
fs.mkdirSync(screenshotDir, { recursive: true });

const svcHeaders = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function svcInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${table} failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function svcDelete(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: svcHeaders,
  });
  if (!res.ok) throw new Error(`DELETE ${table} failed ${res.status}: ${await res.text()}`);
}

async function svcCount(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
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
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      if (!ownText || ownText.length === 0) continue;

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
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) {
          bg = { r: +m[1], g: +m[2], b: +m[3] };
          break;
        }
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
        problems.push({
          text: ownText.substring(0, 60),
          contrast: contrast.toFixed(2),
          required: minContrast,
          fg: `rgb(${fg.r},${fg.g},${fg.b})`,
          bg: `rgb(${bg.r},${bg.g},${bg.b})`,
          fontSize,
        });
      }
    }
    return problems;
  });
}

function reportIssues(label, issues) {
  if (issues.length) {
    console.log(`${label}: CONTRAST ISSUES (${issues.length}):`);
    issues.forEach((i) =>
      console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`)
    );
  } else {
    console.log(`${label}: no contrast issues.`);
  }
}

async function checkNoHScroll(page, label) {
  const h = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (h.scrollWidth > h.clientWidth || h.bodyScrollWidth > h.clientWidth) {
    console.log(`${label}: HORIZONTAL SCROLL DETECTED:`, JSON.stringify(h));
  } else {
    console.log(`${label}: no horizontal scrolling.`);
  }
}

/** Screenshot just the CRM section (clipped by its bounding box). */
async function shootCrmSection(page, file) {
  const box = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) =>
      e.textContent.includes('Your households')
    );
    const sec = h?.closest('section');
    if (!sec) return null;
    const r = sec.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: r.y + window.scrollY, width: r.width, height: r.height };
  });
  if (!box) {
    console.log('CRM section NOT FOUND on page!');
    return false;
  }
  await page.screenshot({ path: path.join(screenshotDir, file), clip: box });
  return true;
}

/** Read the three widget numbers + preview rows out of the CRM section. */
async function readCrmNumbers(page) {
  return page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) =>
      e.textContent.includes('Your households')
    );
    const sec = h?.closest('section');
    if (!sec) return null;
    const cards = [...sec.querySelectorAll('button')]
      .filter((b) => b.querySelector('p.tabular-nums'))
      .map((b) => ({
        label: b.querySelector('p.uppercase')?.textContent.trim(),
        value: b.querySelector('p.tabular-nums')?.textContent.trim(),
      }));
    const previewRows = [...sec.querySelectorAll('li button')].map((b) => ({
      name: b.querySelector('.font-serif')?.textContent.trim(),
      reason: b.querySelectorAll('p')[1]?.textContent.trim(),
    }));
    const emptyState = sec.textContent.includes('all caught up');
    return { cards, previewRows, emptyState };
  });
}

async function auditDashboard(page, tag) {
  // Desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(screenshotDir, `dashboard-${tag}-full.png`), fullPage: true });
  await shootCrmSection(page, `crm-section-${tag}.png`);
  console.log(`\n=== ${tag.toUpperCase()} — DESKTOP ===`);
  console.log('CRM numbers:', JSON.stringify(await readCrmNumbers(page), null, 2));
  reportIssues('Desktop', await contrastAudit(page));

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(screenshotDir, `dashboard-${tag}-mobile-full.png`), fullPage: true });
  await shootCrmSection(page, `crm-section-${tag}-mobile.png`);
  console.log(`=== ${tag.toUpperCase()} — MOBILE 375px ===`);
  reportIssues('Mobile', await contrastAudit(page));
  await checkNoHScroll(page, 'Mobile');
}

(async () => {
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
  await new Promise((r) => setTimeout(r, 3000));
  console.log('Post-login URL:', page.url());

  // Admin user id from the stored session (agent_id for seeded rows)
  const adminId = await page.evaluate((projectId) => {
    const raw = localStorage.getItem(`sb-${projectId}-auth-token`);
    return raw ? JSON.parse(raw)?.user?.id ?? null : null;
  }, process.env.VITE_SUPABASE_PROJECT_ID);
  if (!adminId) throw new Error('Could not read admin user id from session');
  console.log('Admin user id:', adminId);

  // --- Pass 1: EMPTY state ---
  await auditDashboard(page, 'empty');

  // --- Seed test data ---
  console.log('\nSeeding test clients...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const fmtDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayTask = new Date();
  todayTask.setHours(15, 0, 0, 0); // 3pm today, local

  const clients = await svcInsert('clients', [
    {
      agent_id: adminId,
      household_name: 'TEST Harrington Household',
      household_type: 'couple',
      lifecycle_stage: 'engaged',
      client_status: 'active',
      next_action_date: null, // -> needs attention: no next action
      next_action_type: null, // (bulk insert: all rows need identical keys)
    },
    {
      agent_id: adminId,
      household_name: 'TEST Chen Family',
      household_type: 'family',
      lifecycle_stage: 'discovery_booked',
      client_status: 'active',
      next_action_date: fmtDate(yesterday), // -> needs attention: overdue
      next_action_type: 'Call about pre-approval',
    },
    {
      agent_id: adminId,
      household_name: 'TEST Nakamura Household',
      household_type: 'single',
      lifecycle_stage: 'engaged',
      client_status: 'active',
      next_action_date: fmtDate(nextWeek), // healthy — active household only
      next_action_type: 'Shortlist review',
    },
  ]);
  const clientIds = clients.map((c) => c.id);
  console.log('Seeded client ids:', clientIds.join(', '));

  const tasks = await svcInsert('client_tasks', [
    {
      client_id: clients[2].id,
      agent_id: adminId,
      title: 'TEST Send shortlist summary',
      task_type: 'follow_up',
      status: 'open',
      due_at: todayTask.toISOString(), // -> tasks due today: 1
    },
  ]);
  console.log('Seeded task id:', tasks[0].id);
  console.log('Expected: needing attention = 2, tasks due today = 1, active households = 3');

  // --- Pass 2: SEEDED state ---
  await auditDashboard(page, 'seeded');

  // --- Cleanup ---
  console.log('\nDeleting seeded rows...');
  await svcDelete('client_tasks', `id=eq.${tasks[0].id}`);
  await svcDelete('clients', `id=in.(${clientIds.join(',')})`); // members/notes/activities cascade

  const tables = ['clients', 'client_members', 'client_tasks', 'client_notes', 'client_activities'];
  console.log('\nFinal CRM table counts:');
  for (const t of tables) {
    console.log(`  ${t}: ${await svcCount(t)}`);
  }

  // Windows: browser.close() can throw EPERM deleting its temp Chrome
  // profile (teardown race). All verification is done by now — ignore it.
  await browser.close().catch(() => {});
  console.log('\nDone. Screenshots in', screenshotDir);
  process.exit(0);
})();
