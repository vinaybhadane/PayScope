// Run against a local production build. API calls are intercepted and never reach stored data.
const assert = require('node:assert/strict');
const { chromium } = require('../apps/web/node_modules/playwright');
const axe = require.resolve('../apps/web/node_modules/axe-core/axe.min.js');

const base = new URL(process.env.WEB_BASE_URL || 'http://127.0.0.1:3031');
const canonicalOrigin = 'https://payscope-web.onrender.com';
const publicPaths = ['/', '/about', '/privacy'];
const privatePaths = ['/dashboard', '/payments', '/commitments', '/insights', '/financial-impact', '/savings',
  '/cancellations', '/relationships', '/upload', '/merchants', '/merchant-review'];
const ruleIds = ['color-contrast', 'heading-order', 'region', 'skip-link', 'select-name'];

async function checkResponse(page, path) {
  const response = await page.goto(new URL(path, base).href, { waitUntil: 'load' });
  assert.equal(response.status(), 200, path);
  const headers = await response.allHeaders();
  assert.equal(headers['x-frame-options'], 'DENY');
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['permissions-policy'], 'geolocation=(), camera=(), microphone=()');
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(headers['content-security-policy'], /script-src-attr 'none'/);
  assert.doesNotMatch(headers['content-security-policy'], /'unsafe-eval'/);
  return response;
}

async function checkAxe(page, path) {
  await page.addScriptTag({ path: axe });
  const result = await page.evaluate((rules) => window.axe.run({ runOnly: { type: 'rule', values: rules } }), ruleIds);
  assert.deepEqual(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), [], path);
  console.log(`PASS axe ${result.testEngine.version} ${path} (${page.viewportSize().width}px)`);
}

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const wrongTypes = [];
    page.on('response', (response) => {
      if (!response.url().startsWith(base.origin + '/_next/static/')) return;
      const type = response.request().resourceType();
      const mime = response.headers()['content-type'] || '';
      if ((type === 'script' && !mime.includes('javascript')) || (type === 'stylesheet' && !mime.includes('text/css'))) {
        wrongTypes.push(type);
      }
    });
    await page.route('**/api/v1/**', (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === '/api/v1/auth/guest') return route.fulfill({ json: { access_token: 'synthetic-browser-session' } });
      if (pathname === '/api/v1/auth/logout') return route.fulfill({ json: { authenticated: false } });
      if (pathname === '/api/v1/dashboard/summary') return route.fulfill({ json: {
        kpis: { monthly_recurring_spend: '125.00', annualized_recurring_spend: '1500.00', active_commitments_count: 1,
          potential_annual_savings: '0.00', open_insights_count: 0 },
        financial_overview: { historical_amounts: ['100.00', '125.00'], monthly_activity: [
          { month_key: '2025-11', month_label: 'Nov 2025', gross_debit: '100.00', credits: '250.00', recurring_debit: '100.00', net_spend: '-150.00' },
          { month_key: '2025-12', month_label: 'Dec 2025', gross_debit: '125.00', credits: '275.50', recurring_debit: '125.00', net_spend: '-150.50' },
        ] },
        category_distribution: {}, top_commitments: [], recent_insights: [],
      } });
      return route.fulfill({ status: 401, json: { detail: 'No browser fixture for this API' } });
    });
    await page.addInitScript(() => {
      window.cspFailures = [];
      document.addEventListener('securitypolicyviolation', (event) => window.cspFailures.push(event.effectiveDirective));
      sessionStorage.setItem('payscope_intro_transition_seen', 'true');
    });

    for (const path of publicPaths) {
      const response = await checkResponse(page, path);
      const html = await response.text();
      const canonical = new URL(path, canonicalOrigin).href;
      assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1, path);
      const tag = html.match(/<link rel="canonical" href="([^"]+)"/);
      assert.equal(new URL(tag[1]).href, canonical, path);
      for (const field of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']) {
        assert.ok(html.includes(`property="${field}"`), `${path}: ${field}`);
      }
      assert.ok(html.includes('name="twitter:card"'));
      if (path === '/') await page.getByRole('button', { name: 'Accept All', exact: true }).waitFor();
      await checkAxe(page, path);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content', path);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content', path);
      assert.equal(await page.getByRole('main').count(), 1, path);

      if (path === '/') {
        await page.getByRole('button', { name: 'Accept All', exact: true }).hover();
        await checkAxe(page, '/ cookie hover');
        await page.getByRole('button', { name: 'Essential Only' }).click();
        const open = page.getByRole('button', { name: 'Explore PayScope' });
        await open.click();
        const dialog = page.getByRole('dialog', { name: 'Welcome to PayScope' });
        await dialog.waitFor();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Close dialog');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await open.evaluate(el => el === document.activeElement), true);
        for (const name of ['Download app', 'Terms', 'Contact']) {
          const opener = page.getByRole('button', { name, exact: true }).first();
          await opener.click();
          const modal = page.getByRole('dialog');
          await modal.waitFor();
          await page.keyboard.press('Shift+Tab');
          assert.ok(await modal.evaluate((element) => element.contains(document.activeElement)), name);
          await checkAxe(page, `/ ${name} dialog`);
          if (name === 'Contact') assert.equal(await modal.getByRole('textbox', { name: 'Your Name' }).count(), 1);
          await page.keyboard.press('Escape');
          await modal.waitFor({ state: 'hidden' });
          assert.ok(await opener.evaluate((element) => element === document.activeElement), name);
        }
      }
      assert.deepEqual(await page.evaluate(() => window.cspFailures), [], path);
    }

    await checkResponse(page, '/dashboard');
    await page.getByRole('heading', { name: 'Dashboard Locked', level: 1 }).waitFor();
    assert.equal(await page.getByRole('main').getAttribute('id'), 'main-content');
    await page.keyboard.press('Escape');
    await page.goto(base.href);
    await page.getByRole('button', { name: 'Explore PayScope' }).click();
    await page.getByRole('button', { name: 'Explore the free demo' }).click();
    await page.waitForURL('**/dashboard');
    const chart = page.getByRole('region', { name: 'Monthly payment activity' });
    await chart.getByRole('button', { name: 'Inflow', exact: true }).click();
    await chart.getByText('₹275.50', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.cspFailures), [], 'Chart interactions under CSP');

    for (const path of privatePaths) {
      const response = await checkResponse(page, path);
      assert.equal((await response.allHeaders())['x-robots-tag'], 'noindex', path);
      await page.getByRole('main').waitFor();
      assert.equal(await page.getByRole('main').count(), 1, path);
      if (path === '/commitments') await checkAxe(page, path);
      assert.deepEqual(await page.evaluate(() => window.cspFailures), [], path);
    }
    assert.deepEqual(wrongTypes, []);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(base.href);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('payscope_guest_token')), null);

    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await checkResponse(page, '/');
      await checkAxe(page, '/');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }

    const sitemap = await page.request.get(new URL('/sitemap.xml', base).href);
    assert.equal(sitemap.status(), 200);
    assert.match(sitemap.headers()['content-type'], /xml/);
    const xml = await sitemap.text();
    const urls = await page.evaluate((text) => {
      const parsed = new DOMParser().parseFromString(text, 'application/xml');
      if (parsed.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
      return [...parsed.querySelectorAll('loc')].map((item) => item.textContent);
    }, xml);
    assert.deepEqual(urls, publicPaths.map((path) => new URL(path, canonicalOrigin).href));

    const robots = await page.request.get(new URL('/robots.txt', base).href);
    assert.equal(robots.status(), 200);
    assert.match(robots.headers()['content-type'], /text\/plain/);
    assert.match(await robots.text(), /Sitemap: https:\/\/payscope-web\.onrender\.com\/sitemap\.xml/);

    const image = await page.request.get(new URL('/holdingPhone.png', base).href);
    assert.equal(image.status(), 200);
    assert.match(image.headers()['content-type'], /^image\/png/);

    // A deliberately unlisted loopback resource should be stopped by the browser policy.
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.src = 'http://127.0.0.1:3032/csp-regression-fixture.js';
      document.head.append(script);
    });
    await page.waitForFunction(() => window.cspFailures.includes('script-src-elem'));
    console.log('PASS production headers, asset MIME, metadata, sitemap, robots, keyboard navigation, hydration and route smoke checks.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
