/**
 * Auth page redesign verification: screenshots at 1280px and 375px,
 * sign-in + sign-up modes, with the same contrast audit used for the dashboard.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const screenshotDir = './screenshots/auth-redesign';
fs.mkdirSync(screenshotDir, { recursive: true });

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

async function audit(page, label) {
  const issues = await contrastAudit(page);
  if (issues.length) {
    console.log(`CONTRAST ISSUES — ${label} (${issues.length}):`);
    issues.forEach((i) =>
      console.log(`  "${i.text}" contrast=${i.contrast} (need ${i.required}) fg=${i.fg} bg=${i.bg} size=${i.fontSize}px`)
    );
  } else {
    console.log(`No contrast issues — ${label}.`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Desktop 1280px
  await page.setViewport({ width: 1280, height: 832 });
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'auth-desktop-signin.png'), fullPage: true });
  await audit(page, 'desktop sign-in');

  await page.goto(`${baseUrl}/auth?mode=signup`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'auth-desktop-signup.png'), fullPage: true });
  await audit(page, 'desktop sign-up');

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'auth-mobile-signin.png'), fullPage: true });
  await audit(page, 'mobile sign-in');

  const hScroll = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  console.log(hScroll.sw > hScroll.cw ? `HORIZONTAL SCROLL: ${JSON.stringify(hScroll)}` : 'No horizontal scrolling on mobile.');

  // Input heights >= 44px
  const inputHeights = await page.evaluate(() =>
    [...document.querySelectorAll('input, button[type="submit"]')].map((el) => ({
      id: el.id || el.textContent.trim().substring(0, 20),
      height: el.getBoundingClientRect().height,
    }))
  );
  const small = inputHeights.filter((i) => i.height > 0 && i.height < 44);
  console.log(small.length ? `TOUCH TARGETS UNDER 44px: ${JSON.stringify(small)}` : 'All inputs/submit >= 44px.');

  await browser.close();
  console.log('Screenshots in', screenshotDir);
})();
