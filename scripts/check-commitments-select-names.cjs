const assert = require('node:assert/strict');
const { chromium } = require('../apps/web/node_modules/playwright');

async function checkSelectNames() {
  const base = new URL(process.env.WEB_BASE_URL || 'http://127.0.0.1:3031');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const page = await browser.newPage();
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) return route.abort();
      if (url.pathname.startsWith('/api/v1/')) {
        return route.fulfill({ status: 401, json: { detail: 'Unauthenticated test session' } });
      }
      return route.continue();
    });

    const response = await page.goto(new URL('/commitments', base).href);
    assert.equal(response?.status(), 200, 'Subscriptions must load');
    const main = page.getByRole('main');
    const labels = ['Billing period', 'Commitment type', 'Commitment status', 'Confidence level'];
    assert.equal(await main.getByRole('combobox').count(), labels.length);

    const missing = [];
    for (const name of labels) {
      if (await main.getByRole('combobox', { name, exact: true }).count() !== 1) missing.push(name);
    }
    assert.deepEqual(missing, [], 'Each subscription filter must have a distinct accessible name');

    const period = main.getByRole('combobox', { name: 'Billing period', exact: true });
    await period.selectOption('monthly');
    assert.equal(await period.inputValue(), 'monthly');
    console.log('PASS: All four subscription filters have accessible names and the billing filter remains selectable.');
  } finally {
    await browser.close();
  }
}

checkSelectNames().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
