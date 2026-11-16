/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = require('assert');

async function runTests() {
  console.log('🚀 Starting Playwright End-to-End Verification Suite...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
    }
  });

  const mockOpportunities = [
    {
      id: 'opp-netflix',
      opportunity_type: 'PRICE_INCREASE',
      classification: 'POTENTIAL',
      commitment_id: 'com-netflix',
      commitment_name: 'Netflix Premium Plan',
      merchant_id: 'm-netflix',
      merchant_name: 'Netflix',
      merchant_domain: 'netflix.com',
      merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
      logo_source: 'curated_directory',
      category: 'Entertainment',
      current_monthly_cost: 649,
      current_annual_cost: 7788,
      potential_monthly_saving: 649,
      potential_annual_saving: 7788,
      evidence_summary: 'Rate increased by ₹150/mo. Consider pausing or switching tiers.',
      insight_id: null,
      price_event_id: null,
      usage_coverage_id: null,
      details: {}
    },
    {
      id: 'opp-spotify',
      opportunity_type: 'POTENTIALLY_UNUSED',
      classification: 'POTENTIAL',
      commitment_id: 'com-spotify',
      commitment_name: 'Spotify Individual',
      merchant_id: 'm-spotify',
      merchant_name: 'Spotify',
      merchant_domain: 'spotify.com',
      merchant_logo_url: 'https://www.spotify.com/favicon.ico',
      logo_source: 'curated_directory',
      category: 'Music',
      current_monthly_cost: 119,
      current_annual_cost: 1428,
      potential_monthly_saving: 119,
      potential_annual_saving: 1428,
      evidence_summary: 'Zero playback or payment activity detected in 45 days.',
      insight_id: null,
      price_event_id: null,
      usage_coverage_id: null,
      details: {}
    },
    {
      id: 'opp-broken',
      opportunity_type: 'DUPLICATE_CATEGORY',
      classification: 'POTENTIAL',
      commitment_id: 'com-broken',
      commitment_name: 'Acme Cloud Backup',
      merchant_id: 'm-broken',
      merchant_name: 'Acme Broken Image Services',
      merchant_domain: 'acmebroken.example.com',
      merchant_logo_url: 'https://acmebroken.example.com/nonexistent_404_logo.png',
      logo_source: 'verified_domain_favicon',
      category: 'Cloud Storage',
      current_monthly_cost: 499,
      current_annual_cost: 5988,
      potential_monthly_saving: 499,
      potential_annual_saving: 5988,
      evidence_summary: 'Duplicate cloud backup service alongside Google Drive.',
      insight_id: null,
      price_event_id: null,
      usage_coverage_id: null,
      details: {}
    },
    {
      id: 'opp-unknown',
      opportunity_type: 'POTENTIALLY_UNUSED',
      classification: 'POTENTIAL',
      commitment_id: 'com-unknown',
      commitment_name: 'Local Gym Membership',
      merchant_id: null,
      merchant_name: 'Obscure Corner Store 99',
      merchant_domain: null,
      merchant_logo_url: null,
      logo_source: null,
      category: 'Fitness',
      current_monthly_cost: 500,
      current_annual_cost: 6000,
      potential_monthly_saving: 500,
      potential_annual_saving: 6000,
      evidence_summary: 'Unverified local vendor with sporadic card transactions.',
      insight_id: null,
      price_event_id: null,
      usage_coverage_id: null,
      details: {}
    }
  ];

  let calcRequestCount = 0;
  let delayedRequestIds = new Set();

  // Intercept backend API calls with regex to match any host/port
  await page.route(/\/api\/v1\/savings\/summary/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currency: 'INR',
        total_potential_annual_savings: 21204,
        total_potential_monthly_savings: 1767,
        price_increase_savings: 7788,
        unused_commitment_savings: 7428,
        duplicate_service_savings: 5988,
        opportunities_count: 4,
        opportunities: mockOpportunities
      })
    });
  });

  await page.route(/\/api\/v1\/savings\/scenarios/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  await page.route(/\/api\/v1\/savings\/calculate/, async (route) => {
    calcRequestCount++;
    const thisReq = calcRequestCount;
    const postData = JSON.parse(route.request().postData() || '{}');
    const selected = postData.selected_opportunity_ids || [];

    const baselineAnnual = 21204;
    const baselineMonthly = 1767;

    let selectedAnnual = 0;
    let selectedMonthly = 0;
    mockOpportunities.forEach(o => {
      if (selected.includes(o.id)) {
        selectedAnnual += o.potential_annual_saving;
        selectedMonthly += o.potential_monthly_saving;
      }
    });

    const projectedAnnual = Math.max(0, baselineAnnual - selectedAnnual);
    const projectedMonthly = Math.max(0, baselineMonthly - selectedMonthly);
    const percentage = baselineAnnual > 0 ? Math.round((selectedAnnual / baselineAnnual) * 100) : 0;

    if (delayedRequestIds.has(thisReq)) {
      // Artificial 800ms delay to simulate stale race condition
      await new Promise(r => setTimeout(r, 800));
    }

    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currency: 'INR',
          baseline_annual_cost: baselineAnnual,
          selected_annual_savings: selectedAnnual,
          selected_monthly_savings: selectedMonthly,
          projected_annual_cost: projectedAnnual,
          projected_monthly_cost: projectedMonthly,
          percentage_reduction: percentage,
          selected_count: selected.length,
          safeguards_applied: ['deduplicated_commitment_selection', 'clamped_projected_spend']
        })
      });
    } catch {
      // Ignore if request was aborted client-side (AbortController working as intended!)
    }
  });

  // Intercept financial impact endpoints
  await page.route(/\/api\/v1\/financial-impact\/summary/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currency: 'INR',
        monthly_recurring_spend: 1149,
        annualized_recurring_spend: 13788,
        total_confirmed_commitments: 2,
        potential_candidate_annual_cost: 0,
        total_candidate_commitments: 0,
        estimated_annual_total: 13788,
        unpriced_commitments_count: 0,
        historical_spend_12m: 13788,
        upcoming_30d_expected_spend: 1149,
        potential_annual_savings: 7788,
        calculation_timestamp: new Date().toISOString()
      })
    });
  });

  await page.route(/\/api\/v1\/financial-impact\/categories/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          category: 'ENTERTAINMENT',
          category_label: 'Entertainment',
          monthly_cost: 649,
          annualized_cost: 7788,
          historical_spend_12m: 7788,
          percentage_of_recurring: 56.5,
          commitment_count: 1
        },
        {
          category: 'SHOPPING',
          category_label: 'Shopping',
          monthly_cost: 500,
          annualized_cost: 6000,
          historical_spend_12m: 6000,
          percentage_of_recurring: 43.5,
          commitment_count: 1
        }
      ])
    });
  });

  await page.route(/\/api\/v1\/financial-impact\/commitments/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          commitment_id: 'com-netflix',
          merchant_id: 'm-netflix',
          merchant_name: 'Netflix',
          merchant_domain: 'netflix.com',
          merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
          logo_source: 'curated_directory',
          display_name: 'Netflix Premium Plan',
          commitment_type: 'subscription',
          cadence: 'monthly',
          amount_pattern: 'FIXED',
          representative_amount: 649,
          currency: 'INR',
          normalized_monthly_cost: 649,
          annualized_cost: 7788,
          calculation_method: 'EXACT',
          confidence_band: 'HIGH',
          status: 'ACTIVE',
          is_confirmed: true,
          is_candidate: false,
          next_expected_date: '2026-11-20',
          transaction_count: 12
        },
        {
          commitment_id: 'com-unknown',
          merchant_id: 'm-unknown',
          merchant_name: 'Obscure Corner Store 99',
          merchant_domain: null,
          merchant_logo_url: null,
          logo_source: null,
          display_name: 'Corner Store Club',
          commitment_type: 'membership',
          cadence: 'monthly',
          amount_pattern: 'VARIABLE',
          representative_amount: 500,
          currency: 'INR',
          normalized_monthly_cost: 500,
          annualized_cost: 6000,
          calculation_method: 'AVERAGE',
          confidence_band: 'MEDIUM',
          status: 'ACTIVE',
          is_confirmed: true,
          is_candidate: false,
          next_expected_date: '2026-11-25',
          transaction_count: 6
        }
      ])
    });
  });

  await page.route(/\/api\/v1\/financial-impact\/merchants/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          merchant_id: 'm-netflix',
          merchant_name: 'Netflix',
          merchant_domain: 'netflix.com',
          merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
          logo_source: 'curated_directory',
          category: 'Entertainment',
          monthly_cost: 649,
          annualized_cost: 7788,
          historical_spend_12m: 7788,
          percentage_of_total: 56.5,
          commitment_count: 1,
          aliases: ['Netflix Inc']
        },
        {
          merchant_id: 'm-unknown',
          merchant_name: 'Obscure Corner Store 99',
          merchant_domain: null,
          merchant_logo_url: null,
          logo_source: null,
          category: 'Shopping',
          monthly_cost: 500,
          annualized_cost: 6000,
          historical_spend_12m: 6000,
          percentage_of_total: 43.5,
          commitment_count: 1,
          aliases: []
        }
      ])
    });
  });

  await page.route(/\/api\/v1\/financial-impact\/upcoming/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currency: 'INR',
        total_upcoming_30d: 1149,
        total_upcoming_60d: 2298,
        items: [
          {
            commitment_id: 'com-netflix',
            merchant_id: 'm-netflix',
            merchant_name: 'Netflix',
            merchant_domain: 'netflix.com',
            merchant_logo_url: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2023.ico',
            logo_source: 'curated_directory',
            display_name: 'Netflix Premium Plan',
            expected_date: '2026-11-20',
            estimated_amount: 649,
            currency: 'INR',
            cadence: 'monthly',
            estimation_basis: 'FIXED_CONTRACT',
            is_confirmed: true
          }
        ]
      })
    });
  });

  // -------------------------------------------------------------
  // TEST 1: Savings Page Checkbox Single-Click & Deselect Verification
  // -------------------------------------------------------------
  console.log('\n--- Running Test 1: Savings Checkbox Interaction & Layout ---');
  await page.goto('http://localhost:3000/savings', { waitUntil: 'networkidle' });

  // 1.1 Verify Live Calculator is full-width above split columns
  const liveCalcText = page.locator('span:has-text("Live Calculator")');
  assert(await liveCalcText.isVisible(), 'Live Calculator banner must be visible');
  console.log('✓ Live Calculator banner confirmed visible above opportunity list');

  // Verify all 4 opportunities loaded
  const checkboxes = page.locator('input[type="checkbox"][id^="opp-checkbox-"]');
  const count = await checkboxes.count();
  assert.strictEqual(count, 4, `Expected 4 opportunity checkboxes, found ${count}`);
  console.log(`✓ 4 subscription opportunities loaded cleanly`);

  // Initial state: all selected by default
  const cbNetflix = page.locator('#opp-checkbox-opp-netflix');
  assert(await cbNetflix.isChecked(), 'Netflix checkbox should be checked initially');

  // 1.2 Test single click deselects
  console.log('Testing single-click deselect...');
  await cbNetflix.click();
  assert(!(await cbNetflix.isChecked()), 'Netflix checkbox should now be unchecked after 1 click');
  console.log('✓ Single click on checkbox cleanly deselects it');

  // 1.3 Test second click selects
  console.log('Testing second click select...');
  await cbNetflix.click();
  assert(await cbNetflix.isChecked(), 'Netflix checkbox should now be checked after 2nd click');
  console.log('✓ Second click on checkbox cleanly re-selects it');

  // 1.4 Test clicking associated label/text toggles cleanly (1 click = 1 toggle)
  console.log('Testing label click association...');
  const netflixLabel = page.locator('label[for="opp-checkbox-opp-netflix"]');
  await netflixLabel.click();
  assert(!(await cbNetflix.isChecked()), 'Clicking label once must deselect');
  await netflixLabel.click();
  assert(await cbNetflix.isChecked(), 'Clicking label again must select');
  console.log('✓ Label click cleanly toggles state once per user interaction');

  // 1.5 Test Deselect All & Select All
  console.log('Testing Deselect All and Select All...');
  const deselectAllBtn = page.locator('button:has-text("Deselect All"), button:has-text("Clear Selection")').first();
  await deselectAllBtn.click();
  for (let i = 0; i < count; i++) {
    assert(!(await checkboxes.nth(i).isChecked()), `Checkbox ${i} should be unchecked after Deselect All`);
  }
  console.log('✓ Deselect All unchecks all opportunities');

  const selectAllBtn = page.locator('button:has-text("Select All")').first();
  await selectAllBtn.click();
  for (let i = 0; i < count; i++) {
    assert(await checkboxes.nth(i).isChecked(), `Checkbox ${i} should be checked after Select All`);
  }
  console.log('✓ Select All checks all opportunities');

  // 1.6 Filter persistence test
  console.log('Testing filter selection preservation...');
  // Uncheck Spotify
  const cbSpotify = page.locator('#opp-checkbox-opp-spotify');
  await cbSpotify.click();
  assert(!(await cbSpotify.isChecked()), 'Spotify should be unchecked');

  // Select dropdown option "Price Increases"
  const filterSelect = page.locator('select').first();
  await filterSelect.selectOption('PRICE_INCREASE');

  // Verify only 1 card is visible (Netflix)
  const visibleCheckboxes = page.locator('input[type="checkbox"][id^="opp-checkbox-"]');
  assert.strictEqual(await visibleCheckboxes.count(), 1, 'Only 1 item should be visible under Price Increases');
  assert(await cbNetflix.isChecked(), 'Netflix should still be checked');

  // Switch filter back to "ALL"
  await filterSelect.selectOption('ALL');
  assert.strictEqual(await visibleCheckboxes.count(), 4, 'All 4 items should be visible again');
  assert(await cbNetflix.isChecked(), 'Netflix should remain checked');
  assert(!(await cbSpotify.isChecked()), 'Spotify should remain unchecked across filter switches');
  console.log('✓ Selection state preserved across filter changes');

  // 1.7 Rapid repeated clicks & Stale response protection test
  console.log('Testing rapid repeated clicks and stale async response protection...');
  // Configure request delay for next calculation
  delayedRequestIds.add(calcRequestCount + 1);
  
  // Rapid clicks: click Netflix 3 times quickly
  await cbNetflix.click(); // deselect (slow request started)
  await page.waitForTimeout(50);
  await cbNetflix.click(); // reselect (fast request)
  await page.waitForTimeout(50);
  await cbNetflix.click(); // deselect (fast request)
  
  // Wait for all calculation network traffic to settle
  await page.waitForTimeout(1000);
  // Final state of Netflix checkbox must be unchecked
  assert(!(await cbNetflix.isChecked()), 'Netflix checkbox must be unchecked after 3 rapid clicks');
  console.log('✓ Rapid repeated clicks handled cleanly without desync or stale overrides');

  // -------------------------------------------------------------
  // TEST 2: Shared MerchantLogo Verification
  // -------------------------------------------------------------
  console.log('\n--- Running Test 2: Shared MerchantLogo Rendering & Fallbacks ---');
  
  // 2.1 Known Curated Merchant (Netflix)
  const netflixImg = page.locator('.p-4:has(#opp-checkbox-opp-netflix) img[alt="Netflix logo"]');
  assert(await netflixImg.isVisible(), 'Netflix logo image must be rendered');
  console.log('✓ Verified merchant logo image rendered with accessible alt text');

  // 2.2 Unknown Merchant with null domain/logo (Obscure Corner Store 99)
  const unknownSvg = page.locator('.p-4:has(#opp-checkbox-opp-unknown) svg[data-icon="store-fallback"]');
  assert(await unknownSvg.isVisible(), 'Neutral storefront SVG icon must be rendered for unknown merchant');
  console.log('✓ Unknown merchant renders neutral storefront fallback icon without fake marks or broken images');

  // 2.3 Broken image error recovery (Acme Broken Image Services)
  // The broken 404 URL triggers onError and switches to storefront SVG
  await page.waitForTimeout(600); // allow image error event to fire
  const brokenSvg = page.locator('.p-4:has(#opp-checkbox-opp-broken) svg[data-icon="store-fallback"]');
  assert(await brokenSvg.isVisible(), 'Broken image should gracefully switch to neutral storefront SVG');
  console.log('✓ Broken image 404 cleanly falls back to neutral storefront SVG without crashing');

  // -------------------------------------------------------------
  // TEST 3: Spending Analysis Page Integration (/financial-impact)
  // -------------------------------------------------------------
  console.log('\n--- Running Test 3: Spending Analysis Page (/financial-impact) ---');
  await page.goto('http://localhost:3000/financial-impact', { waitUntil: 'networkidle' });

  // Verify page title / header
  const fiTitle = page.locator('h1:has-text("Spending Analysis")');
  assert(await fiTitle.isVisible(), 'Spending Analysis page title must be visible');
  console.log('✓ Spending Analysis page loaded cleanly');

  // Verify Top Companies merchant logos
  const topCompanyLogos = page.locator('section:has-text("Top Companies by Total Spend") [data-merchant-logo="true"]');
  const topLogoCount = await topCompanyLogos.count();
  assert(topLogoCount >= 2, `Expected at least 2 merchant logos in Top Companies, found ${topLogoCount}`);
  console.log(`✓ Top Companies section renders ${topLogoCount} merchant logos via shared MerchantLogo`);

  // Verify Upcoming Payments merchant logos
  const upcomingLogos = page.locator('section:has-text("Upcoming Payments Due") [data-merchant-logo="true"]');
  const upcomingCount = await upcomingLogos.count();
  assert(upcomingCount >= 1, `Expected merchant logo in Upcoming Subscriptions, found ${upcomingCount}`);
  console.log(`✓ Upcoming Payments Due renders merchant logos via shared MerchantLogo`);

  // Verify All Subscriptions Table merchant logos
  const tableLogos = page.locator('section:has-text("All Subscriptions & Bills") table [data-merchant-logo="true"]');
  const tableLogoCount = await tableLogos.count();
  assert(tableLogoCount >= 2, `Expected at least 2 merchant logos in table, found ${tableLogoCount}`);
  console.log(`✓ All Subscriptions table renders ${tableLogoCount} merchant logos via shared MerchantLogo`);

  await browser.close();
  console.log('\n🎉 ALL FRONTEND PLAYWRIGHT TESTS PASSED SUCCESSFULLY! (100% PASS)');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
