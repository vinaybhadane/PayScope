const { chromium } = require('../apps/web/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('payscope_intro_transition_seen', 'true'));
  const output = path.join(__dirname, '../tmp/theme-review');
  fs.mkdirSync(output, { recursive: true });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(output, 'landing.png'), fullPage: true });
  await page.getByRole('button', { name: 'Explore the demo', exact: true }).click();
  await page.locator('.dashboard-metric').first().waitFor();
  const routes = ['dashboard', 'relationships', 'commitments', 'insights', 'financial-impact', 'savings', 'cancellations', 'merchants', 'merchant-review', 'upload', 'about', 'privacy'];
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:3000/${route}`, { waitUntil: 'networkidle' });
    if (await page.getByText('Application error', { exact: false }).count()) throw Error(`Route failed: ${route}`);
    await page.screenshot({ path: path.join(output, `${route}.png`), fullPage: true });
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (background !== 'rgb(229, 232, 206)') throw Error(`Wrong theme on ${route}: ${background}`);
    console.log(`PASS /${route}: sage ivory background`);
  }
  await page.goto('http://127.0.0.1:3000/dashboard', { waitUntil: 'networkidle' });
  await Promise.all([page.waitForResponse(r => r.url().includes('/dashboard/summary') && r.status() === 200), page.getByRole('button', { name: 'Connected', exact: true }).click()]);
  await page.screenshot({ path: path.join(output, 'connected.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['dashboard', 'relationships', '', 'upload']) {
    await page.goto(`http://127.0.0.1:3000/${route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, `${route || 'landing'}-mobile.png`), fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw Error(`Mobile overflow: /${route}`);
  }
  if (errors.length) throw Error(errors.join('\n'));
  console.log('PASS authenticated connected dashboard, mobile layouts, and browser error checks');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
