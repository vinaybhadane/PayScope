const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../apps/web/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.join(__dirname, '../tmp/ui-refinement');
  fs.mkdirSync(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('payscope_intro_transition_seen', 'true'));
  const visit = async (route) => {
    await page.goto(`http://127.0.0.1:3000/${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    assert.equal(await page.getByText('Application error', { exact: false }).count(), 0, route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow: ${route}`);
  };
  const capture = async (name) => page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });

  await visit('');
  await capture('landing-desktop');
  await page.getByRole('button', { name: 'Explore the demo', exact: true }).click();
  await page.locator('.dashboard-metric').first().waitFor();
  await page.waitForTimeout(1200);
  await capture('dashboard-desktop');

  await page.getByRole('button', { name: 'Search workspace pages', exact: true }).click();
  const search = page.getByRole('combobox', { name: 'Search workspace pages' });
  await search.fill('savings');
  assert.equal(await page.getByRole('option').count(), 1);
  await capture('quick-find');
  await search.press('Enter');
  await page.waitForURL('**/savings');
  await page.locator('.workspace-page-title').waitFor();
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Control+k');
  await search.waitFor();
  await search.fill('not-a-page');
  await page.getByText('No pages found', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  console.log('PASS quick find: filtering, keyboard navigation, empty state, Escape');

  await visit('dashboard');
  await page.setViewportSize({ width: 1440, height: 740 });
  const before = await page.locator('.sidebar-profile').boundingBox();
  const scroll = page.locator('.sidebar-scroll-area');
  const bounds = await scroll.evaluate((el) => ({ height: el.clientHeight, content: el.scrollHeight }));
  assert.ok(bounds.content > bounds.height, 'Sidebar must scroll on short viewports');
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  assert.ok(await scroll.evaluate((el) => el.scrollTop > 0));
  const after = await page.locator('.sidebar-profile').boundingBox();
  assert.equal(before.y, after.y, 'Profile must stay fixed while navigation scrolls');
  await capture('sidebar-scrolled');
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log('PASS independent sidebar scrolling with fixed profile');

  for (const route of ['commitments', 'insights', 'financial-impact', 'savings', 'cancellations', 'merchants', 'merchant-review', 'relationships', 'upload', 'about', 'privacy']) {
    await visit(route);
    await capture(route);
    console.log(`PASS /${route}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await visit('dashboard');
  await capture('dashboard-mobile');
  const toggle = page.getByRole('button', { name: 'Open workspace menu' });
  await toggle.click();
  await page.getByRole('button', { name: 'Close workspace menu' }).waitFor();
  await page.waitForTimeout(400);
  await capture('sidebar-mobile');
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await page.getByRole('button', { name: 'Sign out' }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('link', { name: 'PayScope home', exact: true }).evaluate((el) => el === document.activeElement), true, 'Focus must stay inside mobile menu');
  await page.keyboard.press('Escape');
  assert.equal(await toggle.evaluate((el) => el === document.activeElement), true);
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  await toggle.click();
  await page.getByRole('link', { name: 'Subscriptions', exact: true }).click();
  await page.waitForURL('**/commitments');
  assert.equal(await page.getByRole('dialog', { name: 'Your PayScope workspace' }).count(), 0);
  console.log('PASS mobile menu: focus trap, Escape, focus return, navigation');

  for (const route of ['', 'commitments', 'relationships', 'upload']) {
    await visit(route);
    await capture(`${route || 'landing'}-mobile`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await visit('dashboard');
  assert.equal(await page.locator('.dashboard-metric').first().evaluate((el) => el.getAnimations().length), 0);
  await capture('dashboard-small-reduced-motion');
  console.log('PASS mobile layouts and reduced motion');
  assert.deepEqual(errors, [], 'Browser errors');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
