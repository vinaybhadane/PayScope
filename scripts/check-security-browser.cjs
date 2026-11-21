// Run with the frontend and API connected to an isolated test database.
const assert = require('node:assert/strict');
const { chromium } = require('../apps/web/node_modules/playwright');

(async () => {
  const base = process.env.WEB_BASE_URL || 'http://localhost:3005';
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => console.error('Browser error:', error.message));
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/v1/')) console.log('Browser API request:', request.method(), new URL(request.url()).pathname);
    });
    await page.addInitScript(() => sessionStorage.setItem('payscope_intro_transition_seen', 'true'));
    console.log('Browser check: opening frontend');
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    console.log('Browser check: frontend ready');
    const unauthenticated = await page.evaluate(async () => (await fetch('/api/v1/dashboard/summary')).status);
    assert.equal(unauthenticated, 401);
    console.log('Browser check: anonymous dashboard denied');
    const issued = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/guest') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Get started', exact: true }).click();
    await page.getByRole('button', { name: 'Explore the free demo' }).click();
    const guest = await issued;
    assert.equal(guest.status(), 200);
    console.log('Browser check: guest cookie issued');
    await page.locator('.dashboard-metric').first().waitFor();
    console.log('Browser check: dashboard rendered');
    const cookie = (await context.cookies()).find(c => c.name === 'payscope_token');
    assert.ok(cookie, 'Session cookie must be stored by the browser');
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, 'Strict');
    const state = await page.evaluate(async () => ({
      cookieVisible: document.cookie.includes('payscope_token'),
      tokenStored: sessionStorage.getItem('payscope_guest_session') !== null,
      identity: (await fetch('/api/v1/auth/me', { credentials: 'include' })).status,
      dashboard: (await fetch('/api/v1/dashboard/summary', { credentials: 'include' })).status,
    }));
    assert.deepEqual(state, { cookieVisible: false, tokenStored: false, identity: 200, dashboard: 200 });
    const logout = await page.evaluate(async () => (await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })).status);
    assert.equal(logout, 200);
    assert.equal(await page.evaluate(async () => (await fetch('/api/v1/auth/me', { credentials: 'include' })).status), 401);
    console.log('PASS browser: guest login → HttpOnly/Secure/Strict cookie → dashboard → logout; no JS-visible or stored token');
  } catch (error) {
    console.error('Browser verification failed:', error);
    throw error;
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
  }
})().catch(error => { console.error(error); process.exit(1); });
