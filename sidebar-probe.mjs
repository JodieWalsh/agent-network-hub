/**
 * Probe: is the sidebar gradient actually rendering?
 * Logs computed background styles and captures high-res crops
 * of the sidebar and a stats card.
 */
import puppeteer from 'puppeteer';

const baseUrl = 'http://localhost:8081';
const EMAIL = 'support@the-empowered-patient.org';
const PASSWORD = 'AdminPassword123!';
const suffix = process.argv[2] || 'current';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 15000 });
  await page.type('#email', EMAIL);
  await page.type('#password', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
  ]);
  await new Promise((r) => setTimeout(r, 3000));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const styles = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    const asideStyle = window.getComputedStyle(aside);
    // sample actual pixels via child overlay? Just report styles.
    const card = document.querySelector('.grid.grid-cols-2 > div'); // first stat card
    const cardStyle = card ? window.getComputedStyle(card) : null;
    return {
      aside: {
        backgroundImage: asideStyle.backgroundImage,
        backgroundColor: asideStyle.backgroundColor,
      },
      statCard: cardStyle
        ? {
            background: cardStyle.background.substring(0, 200),
            backdropFilter: cardStyle.backdropFilter,
            boxShadow: cardStyle.boxShadow.substring(0, 300),
            borderTop: cardStyle.borderTop,
          }
        : 'not found',
    };
  });
  console.log(JSON.stringify(styles, null, 2));

  const aside = await page.$('aside');
  await aside.screenshot({ path: `./screenshots/dashboard-redesign/sidebar-${suffix}.png` });
  const card = await page.$('.grid.grid-cols-2 > div');
  if (card) {
    await card.screenshot({ path: `./screenshots/dashboard-redesign/statcard-${suffix}.png` });
  }
  // stats row with surrounding bg for float effect
  const statsRow = await page.$('.grid.grid-cols-2');
  if (statsRow) {
    await statsRow.screenshot({ path: `./screenshots/dashboard-redesign/statsrow-${suffix}.png` });
  }

  await browser.close();
  console.log('Crops saved with suffix:', suffix);
})();
