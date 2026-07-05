/**
 * Landing-page honesty-fix verification (pre-launch messaging).
 * Read-only against the page — no DB writes. Proves:
 *   1. No fabricated claims remain ("500+", "2,400+", "4.9", testimonial
 *      names, "Trusted by Professionals Across Australia")
 *   2. New truthful sections render (launch bar, founding cohort, final CTA)
 *   3. No country-specific NEW copy ("Built in Australia" not introduced)
 *   4. Zero contrast issues, mobile clean, layout intact
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const screenshotDir = './screenshots/honesty-fix';
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
let contrastFailures = 0;
function report(label, issues) {
  if (issues.length) {
    contrastFailures += issues.length;
    console.log(`${label}: CONTRAST ISSUES (${issues.length}):`);
    issues.forEach((i) => console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`));
  } else console.log(`${label}: no contrast issues.`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2500);

  // Case-insensitive: several labels render through CSS `uppercase`, so
  // innerText returns them capitalised regardless of source casing.
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  const has = (s) => text.includes(s.toLowerCase());

  // --- 1. Fabricated claims gone ---
  console.log('Fabricated claims removed:');
  for (const bad of ['500+', '2,400+', '4.9', 'Sarah Mitchell', 'James Thornton', 'Priya Sharma',
    'Trusted by Professionals Across Australia', 'already protecting their clients', 'Average Rating']) {
    console.log(`  "${bad}":`, has(bad) ? 'STILL PRESENT — FAIL!' : 'gone ✓');
  }

  // --- 2. New truthful content present ---
  console.log('\nNew truthful content present:');
  for (const good of ['Launching Soon', 'Founding Cohort Forming', 'The Founding Cohort',
    "Built Alongside the Professionals Who'll Use It", 'First Through the Door',
    'Founding-Member Pricing', 'A Direct Line to the Founders', 'JOIN THE FOUNDING COHORT',
    'Join the Network Built for Buyers Agents', 'founding access is opening soon']) {
    console.log(`  "${good}":`, has(good) ? '✓' : 'MISSING — FAIL!');
  }

  // --- 3. No NEW country-specific copy introduced (global-friendly) ---
  console.log('\nNo new country-specific claims:');
  for (const phrase of ['Built in Australia 🇦🇺', 'Across Australia', 'All States']) {
    const inNewSections = phrase !== "Built in Australia 🇦🇺" && has(phrase);
    console.log(`  "${phrase}":`, inNewSections ? 'PRESENT — check!' : phrase === 'Built in Australia 🇦🇺' && has(phrase) ? 'present (pre-existing footer — untouched, flagged for Dani pass)' : 'not in new copy ✓');
  }

  // --- Screenshots ---
  await page.evaluate(() => document.getElementById('social-proof')?.scrollIntoView());
  await sleep(800);
  await page.screenshot({ path: path.join(screenshotDir, '1-launch-bar-desktop.png') });
  report('Launch bar (desktop)', await contrastAudit(page));

  await page.evaluate(() => {
    const els = [...document.querySelectorAll('h2')];
    els.find((h) => h.textContent.includes('Built Alongside'))?.scrollIntoView({ block: 'center' });
  });
  await sleep(800);
  await page.screenshot({ path: path.join(screenshotDir, '2-founding-cohort-desktop.png') });
  report('Founding cohort section (desktop)', await contrastAudit(page));

  await page.evaluate(() => {
    const els = [...document.querySelectorAll('h2')];
    els.find((h) => h.textContent.includes('Join the Network Built'))?.scrollIntoView({ block: 'center' });
  });
  await sleep(800);
  await page.screenshot({ path: path.join(screenshotDir, '3-final-cta-desktop.png') });
  report('Final CTA (desktop)', await contrastAudit(page));

  // Mobile
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => document.getElementById('social-proof')?.scrollIntoView());
  await sleep(600);
  await page.screenshot({ path: path.join(screenshotDir, '4-launch-bar-mobile.png') });
  report('Launch bar (mobile)', await contrastAudit(page));
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('h2')];
    els.find((h) => h.textContent.includes('Built Alongside'))?.scrollIntoView({ block: 'center' });
  });
  await sleep(600);
  await page.screenshot({ path: path.join(screenshotDir, '5-founding-cohort-mobile.png') });
  report('Founding cohort (mobile)', await contrastAudit(page));
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? `Mobile: HORIZONTAL SCROLL ${JSON.stringify(h)}` : '\nMobile: no horizontal scrolling.');

  // Full page intact
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2500);
  await page.screenshot({ path: path.join(screenshotDir, '6-full-landing-desktop.png'), fullPage: true });
  const sections = await page.evaluate(() =>
    ['social-proof', 'how-it-works', 'early-access', 'pricing'].every((id) => !!document.getElementById(id)));
  console.log('All page sections present:', sections ? '✓' : 'FAIL');
  report('Full landing (desktop)', await contrastAudit(page));

  console.log(`\nTotal contrast failures: ${contrastFailures}`);
  console.log('Done. Screenshots in', screenshotDir);
  await browser.close().catch(() => {});
  process.exit(0);
})();
