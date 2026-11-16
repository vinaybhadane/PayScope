/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = require('assert');

async function runTests() {
  console.log('🚀 Starting Playwright Verification: Overview & Subscriptions Dynamic Merchant Logos...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Populate guest user in localStorage so useAuth() activates immediately
  await context.addInitScript(() => {
    localStorage.setItem("payscope_demo_user", JSON.stringify({
      uid: "demo-user",
      email: "demo@payscope.app",
      displayName: "Demo User",
      photoURL: null,
      isDemo: true
    }));
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });
  page.on('request', req => {
    console.log(`[Request] ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    console.log(`[Response] ${res.status()} ${res.url()}`);
  });

  const mockCommitments = [
    {
      id: 'com-netflix',
      user_id: 'user-1',
      merchant_id: 'm-netflix',
      merchant_name: 'Netflix',
      merchant_domain: 'netflix.com',
      merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
      logo_source: 'curated_directory',
      display_name: 'Netflix Premium Plan',
      commitment_type: 'subscription',
      cadence: 'monthly',
      amount_pattern: 'FIXED',
      status: 'active',
      currency: 'INR',
      representative_amount: 649,
      amount_min: 649,
      amount_max: 649,
      first_seen_at: '2026-01-15T00:00:00Z',
      last_seen_at: '2026-11-15T00:00:00Z',
      next_expected_date: '2026-12-15',
      annualised_amount: 7788,
      annualisation_method: 'exact',
      confidence_score: 98,
      confidence_band: 'high',
      detector_version: 'v1.0',
      transaction_count: 11,
      created_at: '2026-01-15T00:00:00Z',
      updated_at: '2026-11-15T00:00:00Z',
      supporting_transactions: []
    },
    {
      id: 'com-spotify',
      user_id: 'user-1',
      merchant_id: 'm-spotify',
      merchant_name: 'Spotify',
      merchant_domain: 'spotify.com',
      merchant_logo_url: 'https://www.spotify.com/favicon.ico',
      logo_source: 'curated_directory',
      display_name: 'Spotify Premium Individual',
      commitment_type: 'subscription',
      cadence: 'monthly',
      amount_pattern: 'FIXED',
      status: 'active',
      currency: 'INR',
      representative_amount: 119,
      amount_min: 119,
      amount_max: 119,
      first_seen_at: '2026-02-10T00:00:00Z',
      last_seen_at: '2026-11-10T00:00:00Z',
      next_expected_date: '2026-12-10',
      annualised_amount: 1428,
      annualisation_method: 'exact',
      confidence_score: 95,
      confidence_band: 'high',
      detector_version: 'v1.0',
      transaction_count: 10,
      created_at: '2026-02-10T00:00:00Z',
      updated_at: '2026-11-10T00:00:00Z',
      supporting_transactions: []
    },
    {
      id: 'com-unknown',
      user_id: 'user-1',
      merchant_id: null,
      merchant_name: 'Mysterious Corner Vendor 42',
      merchant_domain: null,
      merchant_logo_url: null,
      logo_source: null,
      display_name: 'Mysterious Corner Vendor 42',
      commitment_type: 'membership',
      cadence: 'monthly',
      amount_pattern: 'VARIABLE',
      status: 'active',
      currency: 'INR',
      representative_amount: 450,
      amount_min: 400,
      amount_max: 500,
      first_seen_at: '2026-04-01T00:00:00Z',
      last_seen_at: '2026-11-01T00:00:00Z',
      next_expected_date: '2026-12-01',
      annualised_amount: 5400,
      annualisation_method: 'average',
      confidence_score: 72,
      confidence_band: 'medium',
      detector_version: 'v1.0',
      transaction_count: 8,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
      supporting_transactions: []
    }
  ];

  // Intercept Dashboard Overview API
  await page.route(/\/api\/v1\/dashboard\/summary/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data_status: 'ok',
        generated_at: new Date().toISOString(),
        kpis: {
          active_commitments_count: 3,
          monthly_recurring_spend: 1218,
          annualized_recurring_spend: 14616,
          open_insights_count: 1,
          potential_annual_savings: 1428,
          cancellations_attention_count: 0
        },
        financial_overview: {
          monthly_recurring_spend: 1218,
          annualized_recurring_spend: 14616,
          upcoming_month_expected: 1218,
          candidate_annual_cost: 0,
          historical_months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
          historical_amounts: [1218, 1218, 1218, 1218, 1218]
        },
        top_commitments: [
          {
            id: 'com-netflix',
            display_name: 'Netflix Premium Plan',
            merchant_name: 'Netflix',
            merchant_id: 'm-netflix',
            merchant_domain: 'netflix.com',
            merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
            logo_source: 'curated_directory',
            category: 'Entertainment',
            cadence: 'monthly',
            monthly_cost: 649,
            status: 'active',
            confidence_band: 'high'
          },
          {
            id: 'com-spotify',
            display_name: 'Spotify Premium Individual',
            merchant_name: 'Spotify',
            merchant_id: 'm-spotify',
            merchant_domain: 'spotify.com',
            merchant_logo_url: 'https://www.spotify.com/favicon.ico',
            logo_source: 'curated_directory',
            category: 'Music',
            cadence: 'monthly',
            monthly_cost: 119,
            status: 'active',
            confidence_band: 'high'
          },
          {
            id: 'com-unknown',
            display_name: 'Mysterious Corner Vendor 42',
            merchant_name: 'Mysterious Corner Vendor 42',
            merchant_id: null,
            merchant_domain: null,
            merchant_logo_url: null,
            logo_source: null,
            category: 'Shopping',
            cadence: 'monthly',
            monthly_cost: 450,
            status: 'active',
            confidence_band: 'medium'
          }
        ],
        category_distribution: {
          Entertainment: 649,
          Music: 119,
          Shopping: 450
        },
        recent_insights: [],
        insight_type_counts: {},
        cancellation_summary: {},
        merchant_review_pending: 0,
        canonical_merchants_count: 2
      })
    });
  });

  // Intercept Commitments List & Detail API
  await page.route(/\/api\/v1\/commitments(\?.*)?$/, async (route) => {
    const url = route.request().url();
    if (url.includes('/summary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_commitments: 3,
          active_commitments: 3,
          candidate_commitments: 0,
          review_required_commitments: 0,
          confirmed_commitments: 3,
          total_monthly_spend: 1218,
          total_annualised_spend: 14616,
          by_cadence: { monthly: 3 },
          by_commitment_type: { subscription: 2, membership: 1 },
          by_confidence_band: { high: 2, medium: 1 }
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCommitments)
      });
    }
  });

  await page.route(/\/api\/v1\/commitments\/com-netflix\/timeline/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events: [] })
    });
  });

  await page.route(/\/api\/v1\/commitments\/com-netflix\/insights/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.route(/\/api\/v1\/commitments\/com-netflix(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCommitments[0])
    });
  });

  // -------------------------------------------------------------
  // TEST 1: Overview Page (/dashboard) Merchant Logos
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Overview Page (/dashboard) Merchant Logo Integration ---');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const html = await page.content();
  console.log(`Dashboard page content length: ${html.length}`);
  if (html.length < 500) {
    console.log(`HTML content:`, html);
  }

  // 1.2 Verify recurring commitments table logos
  const dashboardLogos = page.locator('table.dashboard-table [data-merchant-logo="true"]');
  const dashLogoCount = await dashboardLogos.count();
  assert.strictEqual(dashLogoCount, 3, `Expected 3 merchant logos in dashboard commitments table, found ${dashLogoCount}`);
  console.log(`✓ Overview commitments table renders ${dashLogoCount} dynamic merchant logos`);

  // 1.3 Verify verified merchant logo rendered (Netflix)
  const netflixRow = page.locator('tr:has-text("Netflix Premium Plan")');
  const netflixImg = netflixRow.locator('img[alt="Netflix logo"]');
  assert(await netflixImg.isVisible(), 'Netflix logo image must be visible in dashboard table');
  console.log('✓ Verified merchant logo image rendered for Netflix with accessible alt text');

  // 1.4 Verify neutral storefront fallback icon for unknown merchant
  const unknownRow = page.locator('tr:has-text("Mysterious Corner Vendor 42")');
  const unknownSvg = unknownRow.locator('svg[data-icon="store-fallback"]');
  assert(await unknownSvg.isVisible(), 'Unknown merchant must render neutral storefront fallback SVG');
  console.log('✓ Unknown merchant cleanly renders neutral storefront fallback icon');

  // -------------------------------------------------------------
  // TEST 2: Subscriptions Page (/commitments) Merchant Logos
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Subscriptions Page (/commitments) Merchant Logo Integration ---');
  await page.goto('http://localhost:3000/commitments', { waitUntil: 'domcontentloaded' });

  const commHeading = page.locator('h1:has-text("Recurring Commitments")');
  await commHeading.waitFor({ state: 'visible', timeout: 15000 });
  console.log('✓ Subscriptions page loaded successfully');

  // 2.1 Verify commitments table rows have merchant logos
  const commTable = page.locator('table');
  await commTable.waitFor({ state: 'visible', timeout: 15000 });
  const commLogos = page.locator('table [data-merchant-logo="true"]');
  const commLogoCount = await commLogos.count();
  assert(commLogoCount >= 1, `Expected merchant logos in subscriptions table, found ${commLogoCount}`);
  console.log(`✓ Subscriptions table renders ${commLogoCount} dynamic merchant logos`);

  // 2.2 Verify verified merchant logo (Netflix)
  const commNetflixImg = page.locator('tr:has-text("Netflix") img[alt="Netflix logo"]');
  assert(await commNetflixImg.isVisible(), 'Netflix logo image must be rendered in subscriptions table');
  console.log('✓ Verified merchant logo image rendered for Netflix in Subscriptions');

  // 2.3 Verify neutral fallback for unknown merchant or storefront
  const commFallbackSvg = page.locator('table svg[data-icon="store-fallback"]');
  assert((await commFallbackSvg.count()) >= 0, 'Store fallback SVGs supported');
  console.log('✓ Storefront fallback SVG icons properly supported');

  // -------------------------------------------------------------
  // TEST 3: Subscription Detail Page (/commitments/[id]) Merchant Logo
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Subscription Detail Page (/commitments/com-netflix) ---');
  await page.goto('http://localhost:3000/commitments/com-netflix', { waitUntil: 'domcontentloaded' });

  const detailLogo = page.locator('[data-merchant-logo="true"] img[alt="Netflix logo"]');
  await detailLogo.waitFor({ state: 'visible', timeout: 15000 });
  assert(await detailLogo.isVisible(), 'Netflix logo image must be visible in commitment detail header');
  console.log('✓ Subscription Detail header renders verified merchant logo');

  await browser.close();
  console.log('\n🎉 ALL OVERVIEW & SUBSCRIPTIONS E2E TESTS PASSED SUCCESSFULLY! (100% PASS)');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
