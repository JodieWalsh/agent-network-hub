/**
 * CRM Clients page verification.
 * Logs in as seeded admin, screenshots the empty Clients list and the
 * New Client form (desktop + 375px mobile), runs the WCAG contrast audit,
 * then creates ONE test household through the real form to verify the
 * full save chain, and screenshots the populated list.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';

const screenshotDir = './screenshots/crm-clients';
fs.mkdirSync(screenshotDir, { recursive: true });

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

function reportContrast(label, issues) {
  if (issues.length) {
    console.log(`CONTRAST ISSUES on ${label} (${issues.length}):`);
    issues.forEach((i) =>
      console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`)
    );
  } else {
    console.log(`No contrast issues on ${label}.`);
  }
}

/** Set a value on a React-controlled input and fire the change event. */
async function setReactValue(page, selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value
  );
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

  // --- Empty Clients list, desktop ---
  console.log('\n=== CLIENTS LIST (EMPTY) — DESKTOP ===');
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'clients-empty-desktop.png'), fullPage: true });
  reportContrast('empty list (desktop)', await contrastAudit(page));

  // --- Empty Clients list, mobile ---
  console.log('\n=== CLIENTS LIST (EMPTY) — MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'clients-empty-mobile.png'), fullPage: true });
  reportContrast('empty list (mobile)', await contrastAudit(page));
  const hScroll = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  }));
  console.log(hScroll.sw > hScroll.cw ? `HORIZONTAL SCROLL: ${JSON.stringify(hScroll)}` : 'No horizontal scroll on mobile.');

  // --- New Client form, desktop ---
  console.log('\n=== NEW CLIENT FORM — DESKTOP ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/clients/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'client-form-desktop.png'), fullPage: true });
  reportContrast('new client form (desktop)', await contrastAudit(page));

  // --- New Client form, mobile ---
  console.log('\n=== NEW CLIENT FORM — MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/clients/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'client-form-mobile.png'), fullPage: true });
  reportContrast('new client form (mobile)', await contrastAudit(page));

  // --- Create ONE test household through the real form ---
  console.log('\n=== CREATE TEST HOUSEHOLD ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/clients/new`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  await page.waitForSelector('#household_name', { timeout: 10000 });
  await setReactValue(page, '#household_name', 'Testington Household');
  await setReactValue(page, '#household_type', 'couple');
  await setReactValue(page, '#lead_source', 'Verification test — safe to delete');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await setReactValue(page, '#next_action_date', tomorrow);
  await setReactValue(page, '#next_action_type', 'Book discovery call');
  await setReactValue(page, '#member_0_first', 'Theo');
  await setReactValue(page, '#member_0_last', 'Testington');
  await setReactValue(page, '#member_0_email', 'theo@example.com');
  await setReactValue(page, '#member_0_phone', '0400 000 000');
  await setReactValue(page, '#member_0_role', 'partner');

  await page.click('#save_client');
  await new Promise((r) => setTimeout(r, 4000));
  console.log('Post-save URL:', page.url());

  // --- List with the test client ---
  console.log('\n=== CLIENTS LIST (WITH TEST CLIENT) ===');
  await page.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'clients-list-with-client.png'), fullPage: true });
  reportContrast('list with client', await contrastAudit(page));

  // --- Verify the full save chain via REST (using the page's own session) ---
  const verification = await page.evaluate(async () => {
    const supabaseUrl = 'https://yrjtdunljzxasyohjdnw.supabase.co';
    const keyRow = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'));
    const session = JSON.parse(localStorage.getItem(keyRow));
    const token = session.access_token;
    // Publishable key: read from the page bundle via any fetch the app makes is
    // not accessible here, so use the token as both (PostgREST accepts JWT apikey)
    const headers = { apikey: token, Authorization: `Bearer ${token}` };
    const c = await (await fetch(
      `${supabaseUrl}/rest/v1/clients?household_name=eq.Testington%20Household&select=id,household_name,primary_contact_member_id,lifecycle_stage,next_action_date`,
      { headers }
    )).json();
    if (!Array.isArray(c) || c.length === 0) return { error: 'client not found' };
    const client = c[0];
    const members = await (await fetch(
      `${supabaseUrl}/rest/v1/client_members?client_id=eq.${client.id}&select=id,full_name,is_primary_contact`,
      { headers }
    )).json();
    const activities = await (await fetch(
      `${supabaseUrl}/rest/v1/client_activities?client_id=eq.${client.id}&select=event_type,event_context`,
      { headers }
    )).json();
    return { client, members, activities };
  });
  console.log('\n=== SAVE CHAIN VERIFICATION ===');
  console.log(JSON.stringify(verification, null, 2));

  await browser.close();
  console.log('\nDone. Screenshots in', screenshotDir);
})();
