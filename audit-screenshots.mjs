import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:8081';
const pages = [
  { url: '/', name: 'dashboard' },
  { url: '/directory', name: 'directory' },
  { url: '/marketplace', name: 'marketplace' },
  { url: '/inspections', name: 'inspections' },
  { url: '/inspections/new', name: 'inspections-new' },
  { url: '/forums', name: 'forums' },
  { url: '/messages', name: 'messages' },
  { url: '/pricing', name: 'pricing' },
  { url: '/settings/profile', name: 'profile' },
  { url: '/settings/billing', name: 'billing' },
  { url: '/settings/notifications', name: 'notifications' }
];

const screenshotDir = './screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

// Function to check color contrast (WCAG)
function parseColor(color) {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return null;
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return null;
}

function getLuminance(rgb) {
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;
  const rL = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gL = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bL = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function getContrast(fgRgb, bgRgb) {
  if (!fgRgb || !bgRgb) return null;
  const fgL = getLuminance(fgRgb);
  const bgL = getLuminance(bgRgb);
  const lighter = Math.max(fgL, bgL);
  const darker = Math.min(fgL, bgL);
  return (lighter + 0.05) / (darker + 0.05);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const results = [];

  for (const page of pages) {
    const fullUrl = baseUrl + page.url;
    console.log(`\n📸 Auditing: ${page.name} (${fullUrl})`);

    try {
      const browser_page = await browser.newPage();
      await browser_page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});

      // Take screenshot
      const screenshotPath = path.join(screenshotDir, `${page.name}.png`);
      await browser_page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Screenshot saved: ${screenshotPath}`);

      // Analyze text visibility
      const issues = await browser_page.evaluate(() => {
        const problems = [];
        const elements = document.querySelectorAll('*');
        
        for (const el of elements) {
          const text = el.textContent.trim();
          if (!text || text.length === 0 || text.length > 200) continue;

          const style = window.getComputedStyle(el);
          const fgColor = style.color;
          const bgColor = style.backgroundColor;
          const fontSize = parseInt(style.fontSize);
          const fontWeight = style.fontWeight;

          // Parse colors
          const fgMatch = fgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          const bgMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

          if (fgMatch && bgMatch) {
            const fg = { r: parseInt(fgMatch[1]), g: parseInt(fgMatch[2]), b: parseInt(fgMatch[3]) };
            const bg = { r: parseInt(bgMatch[1]), g: parseInt(bgMatch[2]), b: parseInt(bgMatch[3]) };

            // Calculate contrast
            const fgL = (0.2126 * (fg.r / 255) + 0.7152 * (fg.g / 255) + 0.0722 * (fg.b / 255));
            const bgL = (0.2126 * (bg.r / 255) + 0.7152 * (bg.g / 255) + 0.0722 * (bg.b / 255));
            const contrast = (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05);

            // WCAG AA: 4.5:1 for normal text, 3:1 for large text
            const minContrast = fontSize >= 18 ? 3 : 4.5;
            if (contrast < minContrast) {
              problems.push({
                text: text.substring(0, 50),
                contrast: contrast.toFixed(2),
                required: minContrast,
                fg: `rgb(${fg.r},${fg.g},${fg.b})`,
                bg: `rgb(${bg.r},${bg.g},${bg.b})`,
                fontSize
              });
            }
          }
        }
        return problems;
      });

      if (issues.length > 0) {
        console.log(`⚠️  Found ${issues.length} contrast issues:`);
        issues.slice(0, 5).forEach(issue => {
          console.log(`   - "${issue.text}": contrast ${issue.contrast} (need ${issue.required})`);
          console.log(`     FG: ${issue.fg}, BG: ${issue.bg}`);
        });
        results.push({ page: page.name, issues: issues.length, details: issues });
      } else {
        console.log(`✨ All text visibility OK`);
        results.push({ page: page.name, issues: 0 });
      }

      await browser_page.close();
    } catch (error) {
      console.log(`❌ Error auditing ${page.name}: ${error.message}`);
      results.push({ page: page.name, error: error.message });
    }
  }

  await browser.close();

  // Summary
  console.log('\n\n📋 AUDIT SUMMARY');
  console.log('================');
  const problemPages = results.filter(r => r.issues > 0);
  if (problemPages.length === 0) {
    console.log('✨ All pages have good text visibility!');
  } else {
    console.log(`⚠️  ${problemPages.length} pages have contrast issues:`);
    problemPages.forEach(p => console.log(`   - ${p.page}: ${p.issues} issues`));
  }

  console.log('\n📸 Screenshots saved to ./screenshots/');
  console.log('\nDetailed report:', JSON.stringify(results, null, 2));
})();
