/**
 * Landing waitlist form verification — Landing-Page Lead Capture, Piece 2.
 *
 * Drives the REAL public landing page (logged out) against the LIVE
 * geneva-lead-intake edge function:
 *   1. Waitlist section renders (desktop + 375px mobile), honeypot invisible
 *   2. Filled form (with UTM params on the URL) → submit → success state
 *      → geneva_contacts row: consent=subscribed, original_source from UTM,
 *        contact_created activity with source=landing_page
 *   3. Second submit WITHOUT consent → row with consent=pending
 *   4. Client-side validation: bad email shows gentle inline error, no POST
 *   5. Full-page screenshot to confirm the rest of the page is intact
 * Cleanup: geneva_* tables back to 0 rows.
 */
import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET) { console.error('Missing env'); process.exit(1); }

const screenshotDir = './screenshots/geneva-waitlist';
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
const shotSection = async (page, name) => {
  const el = await page.$('#early-access');
  if (el) await el.screenshot({ path: path.join(screenshotDir, name) });
  else await page.screenshot({ path: path.join(screenshotDir, name) });
};

const EMAIL_A = 'test.waitlist.consent@example.com';
const EMAIL_B = 'test.waitlist.pending@example.com';

(async () => {
  console.log('Pre-state:');
  for (const t of ['geneva_contacts', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }

  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --- 1. Landing (logged out) with UTM params on the URL ---
  await page.goto(`${baseUrl}/?utm_source=instagram&utm_medium=social&utm_campaign=verify-piece2`, {
    waitUntil: 'networkidle0', timeout: 30000,
  });
  await sleep(2500);
  const onLanding = await page.evaluate(() => document.body.innerText.includes('Join the Waitlist'));
  console.log('\nWaitlist section present on landing:', onLanding ? '✓' : 'MISSING!');

  // Honeypot invisibility (rendered but off-screen, not tabbable, aria-hidden)
  const honeypot = await page.evaluate(() => {
    const el = document.querySelector('#wl_website');
    if (!el) return { exists: false };
    const rect = el.getBoundingClientRect();
    return {
      exists: true,
      offscreen: rect.right < 0,
      tabIndex: el.tabIndex,
      ariaHidden: el.closest('[aria-hidden="true"]') !== null,
    };
  });
  console.log('Honeypot:', JSON.stringify(honeypot),
    honeypot.exists && honeypot.offscreen && honeypot.tabIndex === -1 && honeypot.ariaHidden ? '(invisible + untabbable ✓)' : 'FAIL');

  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(1000);
  await shotSection(page, '1-section-desktop.png');
  report('Waitlist section (desktop)', await contrastAudit(page));

  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(500);
  await shotSection(page, '2-section-mobile.png');
  report('Waitlist section (mobile)', await contrastAudit(page));
  await noHScroll(page, 'Waitlist section (mobile)');
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  // --- 2. Client-side validation: bad email → inline error, nothing sent ---
  await page.type('#wl_first_name', 'TEST Validation');
  await page.type('#wl_email', 'not-an-email');
  await page.click('#wl_submit');
  await sleep(800);
  const valError = await page.evaluate(() => document.querySelector('[data-waitlist-error]')?.textContent ?? null);
  console.log('\nBad-email inline error:', JSON.stringify(valError), valError?.includes('valid email') ? '✓' : 'FAIL');
  const midCount = await svcCount('geneva_contacts?select=id');
  console.log('Rows after failed validation:', midCount, midCount === 0 ? '(nothing sent ✓)' : 'FAIL');

  // --- 3. Real submit WITH consent (UTM attribution flows) ---
  // Clear the React-controlled inputs properly: focus + Ctrl+A + Backspace
  // (direct .value assignment is ignored by React; triple-click selects
  // only part of the text on some platforms).
  const clearField = async (sel) => {
    await page.focus(sel);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
  };
  await clearField('#wl_email');
  await clearField('#wl_first_name');
  await page.type('#wl_first_name', 'TEST Waitlist');
  await page.type('#wl_last_name', 'Consent');
  await page.type('#wl_email', EMAIL_A);
  await page.select('#wl_professional_type', 'conveyancer');
  await page.type('#wl_region_city', 'Perth');
  await page.type('#wl_company', 'Waitlist Conveyancing Co');
  await page.click('#wl_consent');
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(400);
  await shotSection(page, '3-filled-form-desktop.png');
  report('Filled form (desktop)', await contrastAudit(page));
  await page.click('#wl_submit');
  await sleep(3500);
  const successShown = await page.evaluate(() => !!document.querySelector('[data-waitlist-success]'));
  console.log('\nSuccess state shown:', successShown ? '✓' : 'FAIL');
  await shotSection(page, '4-success-desktop.png');
  report('Success state (desktop)', await contrastAudit(page));
  await page.setViewport({ width: 375, height: 812 });
  await sleep(800);
  await page.evaluate(() => document.querySelector('#early-access')?.scrollIntoView());
  await sleep(500);
  await shotSection(page, '5-success-mobile.png');
  report('Success state (mobile)', await contrastAudit(page));
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(500);

  const [cA] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(EMAIL_A)}&select=*`);
  console.log('DB row A:', cA
    ? `id=${cA.id} consent=${cA.email_consent_status} type=${cA.professional_type} source=${cA.original_source} region=${cA.region_city}`
    : 'MISSING!');
  console.log('  consent subscribed:', cA.email_consent_status === 'subscribed' ? '✓' : 'FAIL');
  console.log('  original_source from UTM:', cA.original_source, cA.original_source === 'instagram' ? '✓' : 'FAIL');
  console.log('  forced defaults:', cA.lifecycle_stage === 'new' && cA.owner_id === null && cA.created_by === null ? '✓' : 'FAIL');
  const aA = await svc('GET', `geneva_activities?contact_id=eq.${cA.id}&event_type=eq.contact_created&select=event_context`);
  console.log('  contact_created activity:', aA.length, JSON.stringify(aA[0]?.event_context),
    aA[0]?.event_context?.source === 'landing_page' && aA[0]?.event_context?.utm?.utm_campaign === 'verify-piece2' ? '✓' : 'FAIL');

  // --- 4. Second visitor WITHOUT consent (fresh load, no UTM) ---
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.type('#wl_first_name', 'TEST Pending');
  await page.type('#wl_email', EMAIL_B);
  await page.click('#wl_submit'); // consent left unticked
  await sleep(3500);
  const success2 = await page.evaluate(() => !!document.querySelector('[data-waitlist-success]'));
  console.log('\nSecond submit success state:', success2 ? '✓' : 'FAIL');
  const [cB] = await svc('GET', `geneva_contacts?email=eq.${encodeURIComponent(EMAIL_B)}&select=id,email_consent_status,original_source`);
  console.log('DB row B:', JSON.stringify(cB),
    cB.email_consent_status === 'pending' && cB.original_source === 'direct' ? '(pending + direct ✓)' : 'FAIL');

  // --- 5. Whole page intact: full-page screenshot top to bottom ---
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(screenshotDir, '6-full-landing-desktop.png'), fullPage: true });
  const sections = await page.evaluate(() =>
    ['how-it-works', 'pricing', 'early-access', 'social-proof'].map((id) => !!document.getElementById(id)));
  console.log('\nPage sections all present (how-it-works/pricing/early-access/social-proof):',
    sections.every(Boolean) ? '✓' : JSON.stringify(sections));
  report('Full landing (desktop)', await contrastAudit(page));

  // --- Cleanup ---
  console.log('\nCleaning up test data...');
  await svc('DELETE', `geneva_contacts?email=in.("${EMAIL_A}","${EMAIL_B}")`);
  console.log('Final counts:');
  for (const t of ['geneva_contacts', 'geneva_notes', 'geneva_tasks', 'geneva_activities']) {
    console.log(`  ${t}: ${await svcCount(`${t}?select=id`)} (expect 0)`);
  }
  console.log(`\nTotal contrast failures across all audits: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  console.log(`TEST IDS — contact A (consented): ${cA.id}, contact B (pending): ${cB.id}`);
  await browser.close().catch(() => {});
  process.exit(0);
})();
