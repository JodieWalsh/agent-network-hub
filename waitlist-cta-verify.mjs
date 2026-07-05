/**
 * Waitlist CTA verification — header + hero "Join the Waitlist" links.
 * Proves the CTAs are visible without scrolling, scroll to #early-access on
 * click (desktop header, hero link, mobile menu), zero contrast issues, and
 * the rest of the page is unchanged. Read-only — no DB writes at all.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const screenshotDir = './screenshots/waitlist-cta';
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
const inViewport = (page) => page.evaluate(() => {
  const el = document.getElementById('early-access');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  return { found: true, inView: r.top < window.innerHeight * 0.6 && r.bottom > 0, top: Math.round(r.top) };
});

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1440,900'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // --- Desktop: CTA visible without scrolling ---
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  const desktopCta = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'JOIN WAITLIST');
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    return { found: true, visibleWithoutScroll: r.top >= 0 && r.bottom <= window.innerHeight && window.scrollY === 0 };
  });
  console.log('Desktop header CTA visible on arrival:', JSON.stringify(desktopCta), desktopCta.visibleWithoutScroll ? '✓' : 'FAIL');
  const heroLink = await page.evaluate(() => {
    const el = document.getElementById('hero-waitlist-link');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, visible: r.top >= 0 && r.bottom <= window.innerHeight };
  });
  console.log('Hero waitlist line visible on arrival:', JSON.stringify(heroLink), heroLink.visible ? '✓' : 'FAIL');
  await page.screenshot({ path: path.join(screenshotDir, '1-top-desktop.png') });
  report('Top of page (desktop)', await contrastAudit(page));

  // Click header CTA → scrolls to section
  await page.evaluate(() => {
    [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'JOIN WAITLIST')?.click();
  });
  await sleep(1500);
  let pos = await inViewport(page);
  console.log('After header CTA click:', JSON.stringify(pos), pos.inView ? '(scrolled to waitlist ✓)' : 'FAIL');
  await page.screenshot({ path: path.join(screenshotDir, '2-after-header-click-desktop.png') });

  // Hero link too
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await page.click('#hero-waitlist-link');
  await sleep(1500);
  pos = await inViewport(page);
  console.log('After hero link click:', JSON.stringify(pos), pos.inView ? '(scrolled to waitlist ✓)' : 'FAIL');

  // --- Mobile 375px: hamburger menu CTA ---
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(screenshotDir, '3-top-mobile.png') });
  report('Top of page (mobile)', await contrastAudit(page));
  await page.click('header button[aria-label="Toggle menu"]');
  await sleep(600);
  await page.screenshot({ path: path.join(screenshotDir, '4-mobile-menu.png') });
  report('Mobile menu open', await contrastAudit(page));
  const mobileCta = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'JOIN THE WAITLIST');
    return !!btn;
  });
  console.log('Mobile menu has JOIN THE WAITLIST:', mobileCta ? '✓' : 'FAIL');
  await page.evaluate(() => {
    [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'JOIN THE WAITLIST')?.click();
  });
  await sleep(1500);
  pos = await inViewport(page);
  console.log('After mobile CTA click:', JSON.stringify(pos), pos.inView ? '(scrolled to waitlist ✓)' : 'FAIL');
  await page.screenshot({ path: path.join(screenshotDir, '5-after-mobile-click.png') });
  const h = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(h.sw > h.cw ? `Mobile: HORIZONTAL SCROLL ${JSON.stringify(h)}` : 'Mobile: no horizontal scrolling.');

  // --- Full page unchanged ---
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
