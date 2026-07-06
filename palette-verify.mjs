/**
 * Palette rollout verification: screenshots + contrast audit for all
 * main pages after the quiet-luxury token update.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const baseUrl = 'http://localhost:8081';
const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;
const screenshotDir = './screenshots/palette-rollout';
fs.mkdirSync(screenshotDir, { recursive: true });

const pages = [
  { url: '/forums', name: 'forums' },
  { url: '/messages', name: 'messages' },
  { url: '/marketplace', name: 'marketplace' },
  { url: '/directory', name: 'directory' },
  { url: '/briefs', name: 'briefs' },
  { url: '/pricing', name: 'pricing' },
  { url: '/settings/profile', name: 'settings-profile' },
  { url: '/settings/billing', name: 'settings-billing' },
];

async function contrastAudit(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const el of document.querySelectorAll('*')) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim();
      if (!ownText) continue;
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
          const solid = stops.find((x) => x[4] === undefined || parseFloat(x[4]) >= 0.5);
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
          text: ownText.substring(0, 50),
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
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 832 });

  // Landing page (logged out) first
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'landing.png'), fullPage: true });
  const landingIssues = await contrastAudit(page);
  console.log(landingIssues.length ? `landing: ${landingIssues.length} ISSUES` : 'landing: clean');
  landingIssues.slice(0, 8).forEach((i) => console.log(`  "${i.text}" ${i.contrast} fg=${i.fg} bg=${i.bg} ${i.fontSize}px`));

  // Login
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await new Promise((r) => setTimeout(r, 3000));

  let totalIssues = landingIssues.length;
  for (const p of pages) {
    await page.goto(baseUrl + p.url, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(screenshotDir, `${p.name}.png`), fullPage: true });
    const issues = await contrastAudit(page);
    totalIssues += issues.length;
    console.log(issues.length ? `${p.name}: ${issues.length} ISSUES` : `${p.name}: clean`);
    issues.slice(0, 8).forEach((i) => console.log(`  "${i.text}" ${i.contrast} fg=${i.fg} bg=${i.bg} ${i.fontSize}px`));
  }

  await browser.close();
  console.log(`\nTOTAL ISSUES: ${totalIssues}`);
  console.log('Screenshots in', screenshotDir);
})();
