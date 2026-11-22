// Called with isolated guest credentials over stdin by verify_neo4j_aura.py.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('../apps/web/node_modules/playwright');

async function run() {
  const { webOrigin, workspaces } = JSON.parse(fs.readFileSync(0, 'utf8'));
  const base = new URL(webOrigin);
  assert.equal(base.hostname, '127.0.0.1');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const { token, uid, shown, absent } of workspaces) {
      const context = await browser.newContext();
      try {
        await context.addInitScript(({ origin, token, uid }) => {
          if (location.origin !== origin) return;
          localStorage.setItem('payscope_demo_user', JSON.stringify({ uid, displayName: 'Graph QA', isDemo: true }));
          sessionStorage.setItem('payscope_guest_token', token);
        }, { origin: base.origin, token, uid });
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        const liveResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/graph'
          && response.request().method() === 'GET');
        await page.goto(new URL('/relationships', base).href);
        const graph = await liveResponse;
        assert.equal(graph.status(), 200);
        assert.equal((await graph.json()).source, 'neo4j');
        await page.getByText('Neo4j connected', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Merchants', exact: true }).click();
        await page.getByRole('button', { name: `MerchantDescriptor: ${shown}`, exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: `MerchantDescriptor: ${absent}`, exact: true }).count(), 0);
      } finally {
        await context.close();
      }
    }
    console.log('PASS browser: Relationships rendered different live AuraDB nodes in two isolated guest sessions.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
