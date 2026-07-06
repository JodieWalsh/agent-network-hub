/**
 * Dashboard redesign verification script.
 * Logs in as the seeded admin, screenshots the dashboard and other
 * pages that share DashboardLayout, and runs a text-contrast audit.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const baseUrl = 'http://localhost:8081';
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

const screenshotDir = './screenshots/dashboard-redesign';
fs.mkdirSync(screenshotDir, { recursive: true });

const sharedLayoutPages = [
  { url: '/directory', name: 'directory' },
  { url: '/marketplace', name: 'marketplace' },
  { url: '/inspections', name: 'inspections' },
  { url: '/forums', name: 'forums' },
  { url: '/settings/profile', name: 'settings-profile' },
];

async function contrastAudit(page) {
  return page.evaluate(() => {
    const problems = [];
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      // Only leaf-ish elements with their own text
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

      // Walk up to find effective background
      let bg = null;
      let node = el;
      while (node && node !== document.documentElement) {
        const s = window.getComputedStyle(node);
        const m = s.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) {
          bg = { r: +m[1], g: +m[2], b: +m[3] };
          break;
        }
        // Gradient backgrounds: use the first effectively-opaque colour stop
        // (skip translucent sheen/shade overlay layers)
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

  // --- Dashboard ---
  console.log('\n=== DASHBOARD ===');
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(screenshotDir, 'dashboard-full.png'), fullPage: true });
  await page.screenshot({ path: path.join(screenshotDir, 'dashboard-viewport.png') });
  console.log('Screenshots saved.');

  const issues = await contrastAudit(page);
  if (issues.length) {
    console.log(`CONTRAST ISSUES (${issues.length}):`);
    issues.forEach((i) =>
      console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`)
    );
  } else {
    console.log('No contrast issues on dashboard.');
  }

  // --- Mobile (375px) ---
  console.log('\n=== DASHBOARD MOBILE 375px ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(screenshotDir, 'dashboard-mobile-full.png'), fullPage: true });
  await page.screenshot({ path: path.join(screenshotDir, 'dashboard-mobile-viewport.png') });
  console.log('Mobile screenshots saved.');

  const hScroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (hScroll.scrollWidth > hScroll.clientWidth || hScroll.bodyScrollWidth > hScroll.clientWidth) {
    console.log('HORIZONTAL SCROLL DETECTED:', JSON.stringify(hScroll));
  } else {
    console.log('No horizontal scrolling on mobile.');
  }

  const mobileIssues = await contrastAudit(page);
  if (mobileIssues.length) {
    console.log(`MOBILE CONTRAST ISSUES (${mobileIssues.length}):`);
    mobileIssues.forEach((i) =>
      console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`)
    );
  } else {
    console.log('No contrast issues on mobile dashboard.');
  }

  // Mobile drawer: open the hamburger and screenshot
  try {
    await page.click('button[aria-label="Toggle menu"]');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'dashboard-mobile-drawer.png') });
    console.log('Mobile drawer screenshot saved.');
    const drawerIssues = await contrastAudit(page);
    const drawerOnly = drawerIssues.length;
    console.log(drawerOnly ? `DRAWER CONTRAST ISSUES (${drawerOnly})` : 'No contrast issues with drawer open.');
    if (drawerOnly) drawerIssues.forEach((i) => console.log(`  "${i.text}" contrast=${i.contrast} fg=${i.fg} bg=${i.bg}`));
  } catch (e) {
    console.log('Drawer test failed:', e.message);
  }

  // Restore desktop viewport for remaining pages
  await page.setViewport({ width: 1440, height: 900 });

  // --- Other pages sharing the layout (sidebar/topbar/bg verification) ---
  for (const p of sharedLayoutPages) {
    console.log(`\n=== ${p.name} ===`);
    try {
      await page.goto(baseUrl + p.url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(screenshotDir, `${p.name}.png`) });
      console.log('Screenshot saved.');
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  await browser.close();
  console.log('\nDone. Screenshots in', screenshotDir);
})();
