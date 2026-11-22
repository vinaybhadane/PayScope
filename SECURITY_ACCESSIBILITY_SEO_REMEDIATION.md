# PayScope security, accessibility, and SEO remediation

## Status and checkpoint

- Production: `https://payscope-web.onrender.com` on Render.
- Clean baseline: `7705a72`. Work is on `payscope/remediation` and has not been deployed.
- ArgosX baseline supplied by the owner: overall 81, UX 88, accessibility 83, security 69, performance 100. No new ArgosX score was measured.
- The earlier four unnamed subscription filters were already fixed in `7705a72`. Their regression check passed again.
- Render configuration, database schemas, and provider settings were kept intact. Tests used synthetic data and the dedicated `mandatelens_test` database. No production data was changed.

## A. Baseline inventory

| Surface | Existing implementation and behavior |
| --- | --- |
| Public pages | Next.js App Router and React render `/`, `/about`, and `/privacy`. Landing navigation opens the existing auth, cookie, download, terms, and contact interfaces. The download controls simulate a download and no APK is served. The contact form shows local confirmation and has no delivery endpoint. |
| Authentication | Firebase Google popup, auth state listener, ID token verification, backend token exchange, guest login, logout, and 24 hour guest sessions. The API accepts signed bearers and secure HTTP-only cookies. The frontend uses a guest bearer in session storage as a compatibility fallback. Workspace identity is resolved server-side. No shared-team, admin, or support access path was found for financial records. |
| Overview and navigation | Protected dashboard, payment history chart, relationship explorer, subscription views, file import navigation, branded responsive menu, and workspace notes. Notes have a local path and optional Firebase Firestore storage. |
| Statement import | `/upload` and `/api/v1/imports*` handle previews, mapping, CSV/Excel, text/scanned PDFs, image OCR, background jobs, and duplicate detection. JSON payment notifications also have a parser. Transactions preserve provenance. Credit and debit amounts come from validated source records. |
| Payments and recurring charges | Payment ledger, transaction detail API, merchant matching and review, recurring payments and subscriptions from confirmed cadence, UPI AutoPay indicators, prices, charge changes, and closure evidence. Keyword and category inputs include investment recurrence signals. A standalone SIP management flow was not found. |
| Insights and spending | Statement comparisons use transaction totals by currency and calculate overlap. Optional Gemini explanations use aggregate facts. Financial impact includes historic spending and forecasts. Savings models selections from observed recurring amounts. |
| Graph and cancellation | The relationship API has Neo4j and relational projections. Render's blueprint disables Neo4j for its API service. Cancellation cases track guidance, checklists, user reports, and evidence. |
| Account and reports | Header identity, logout, owner scoped workspace read and clear controls, notes, downloadable reporting, and optional Brevo email alerts. No independent profile editing route was found. |
| Persistence, access, and integrations | FastAPI, SQLAlchemy, psycopg, Alembic, and PostgreSQL. Repo environments support Neon as well as the Render blueprint database. Tenant checks are in `require_identity`, `resolve_workspace_user_id`, and SQLAlchemy bindings. Curated merchant data is shared. User aliases and financial data remain scoped. |
| Other HTTP routes | API groups cover auth, health/readiness, demo/sample files, imports, payments, workspace, merchants/aliases/reviews, commitments, insights, financial impact, savings, cancellations, and graph. Swagger, ReDoc, and OpenAPI require a session. Next's `/api/v1` rewrite preserves existing upstream settings. |

Third-party integration audit covered Firebase Auth and Firestore, Google Identity endpoints and avatar/favicon services, optional Unsplash images, Gemini, Brevo, PostgreSQL/Neon, and optional Neo4j. Next prepackages Geist fonts, local scripts, and CSS. PDF extraction and OCR run on the API server via PDF/Pillow and platform OCR libraries. No client PDF worker, camera/microphone/location use, Payment API, or browser analytics script was found. Build manifests and lockfiles remain unchanged.

## B. Findings, fixes, and individual verification

| # | Original severity and finding | Root cause and change | Verification and status |
| --- | --- | --- | --- |
| 1 | Medium · Missing `X-Frame-Options` | No response header in Next. `apps/web/security-headers.ts` adds `DENY` and CSP `frame-ancestors 'none'`. No product requirement to embed PayScope itself was found. Firebase's provider frame is governed separately by `frame-src`. | Actual local production HTTP and browser assertions pass. Deploy and check Render. |
| 2 | Medium · Missing HSTS | The public host redirected HTTP to HTTPS but emitted no HSTS header. `security-headers.ts` adds `max-age=63072000` on the exact production host. | Live baseline returned a single 301 to HTTPS. Local production host match emitted HSTS. **Host-only** pending authoritative verification of all children. A sampled child resolves through Render's wildcard. No preload. |
| 3 | Low · Missing CSP | Next served HTML without a resource policy. `security-headers.ts` restricts script, frame, network, font, object, worker, and other resource types, blocks inline event attributes, and excludes `unsafe-eval`. API proxy paths retain their existing behavior. | Policy enforced in the local production build. Browser route and interaction checks captured no CSP violations in tested flows. Real Google authentication and live integrations still need staging verification. |
| 4 | Low · Missing `X-Content-Type-Options` | No baseline header. `security-headers.ts` adds `nosniff`. | Header and browser script/CSS MIME checks passed. Local sitemap, robots, and preview PNG MIME verified. API JSON and report behavior are covered separately. |
| 5 | Low · Missing `Permissions-Policy` | No explicit browser capability policy. `security-headers.ts` disables unused geolocation, camera, and microphone access. File inputs do not request these permissions. | Local production headers verified. Upload code and contracts are unchanged. |
| 6 | Low · Missing `Referrer-Policy` | No site policy. `security-headers.ts` adds `strict-origin-when-cross-origin`. | Header verified on local routes. Existing popup and redirect code remains intact. Complete signed-in staging check. |
| 7 | Low · Firebase web API key warning | Client Auth and optional Firestore require the publishable Firebase web configuration. Kept the client configuration and checked server verification and `firestore.rules`. Also hardened the API's cross-origin boundaries and production guest signing configuration. | Backend Firebase verification and token exchange tested with a mocked verifier. Repo Firestore rules require the signed-in owner for create, update, read, and delete. Console settings, deployed rules, and full Google sign-in require owner access. |
| 8 | Medium · Insufficient contrast | White text on the existing orange button measured 3.20:1. `CookieConsentModal.tsx` and verified sibling CTAs use dark text on the same orange. `refinement.css` and Subscriptions apply the same foreground correction to verified active navigation and green discovery controls. | Local axe contrast checks passed on landing normal/hover, public pages, and Subscriptions. Additional dialog controls checked when open. The original background hues and layout are preserved. |
| 9 | Low · Heading hierarchy | Consent used an H4 after H2 content. About and Privacy introduced H3 cards directly under H1. Corrected heading tags in the consent component and page components, retaining style classes. | Targeted `heading-order` test passed on checked public pages. |
| 10 | Low · Content outside landmarks | Consent was a generic fixed container outside the page's main. Added a named `aside` without moving the UI. | Targeted axe `region` test passed. One `main` remains per checked rendered page. |
| 11 | Low · Invalid skip link | About and Privacy had no `#main-content`. Landing had the ID but the target was not focusable. Added the ID where missing and `tabIndex={-1}` to the public mains. | Browser `Tab` then `Enter` focuses `main-content` on all three public pages. |
| 12 | Not specified · Missing sitemap | No sitemap route. `app/sitemap.ts` emits only home, About, and Privacy from the shared public page map. | Local GET 200, `application/xml`, parsed XML, and exactly those three absolute URLs verified. |
| 13 | Not specified · Missing Open Graph | Only title/description existed. `public-site.ts`, the homepage, and the two route layouts set Open Graph and Twitter metadata with the existing PayScope image. | Checked raw HTML for all required tags. The image returns 200 `image/png` locally and at the existing production asset URL. |
| 14 | Not specified · Missing canonical | No page-specific canonical metadata. Shared metadata emits one canonical per public route. | Checked raw HTML for one tag and the normalized absolute URL. Next serializes the root origin without the optional trailing slash. |
| 15 | Not specified · Missing robots | No robots route. `app/robots.ts` allows public crawling, disallows `/api/`, and links to the sitemap. Workspace shells are excluded via `X-Robots-Tag: noindex`. | Local GET 200, `text/plain`, sitemap pointer, and workspace noindex headers verified. API authorization remains independent of crawling policy. |

### CSP compatibility decision

Next's static documents require inline bootstrap scripts and the UI uses inline styles for dynamic visuals. Preserving prerendered pages avoids converting ordinary visits into dynamic renders solely for nonces. Current policy narrows external script origins, blocks inline event attributes, and permits the specific Firebase Auth frame, identity/token/Firestore requests, and configured direct API origins. HTTPS image sources remain allowed for merchant logos. Inline script/style allowances are residual risk. A hash/nonce follow-up requires an independently tested Next rendering strategy. [Next CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy)

## C. Regression results and commands

- **Baseline API:** 242 passed, 5 failed. Failures covered the overly broad preview origin, assertions from the old public readiness/root contract, and outdated cookie/guest/cross-site expectations. The public health and existing guest transport contracts were retained. The test changes assert the present contracts, reject exact unapproved origins, and preserve negative checks for missing or untrusted origins and protected routes.
- **Final API:** 249 passed in the full run. The two warnings came from intentional Pillow image-size boundary tests. An additional authenticated PDF download test passed separately and checked unauthorized access, PDF MIME, cache policy, and the PDF signature.
- **Browser:** Existing Subscriptions accessible-name regression passes. The remediation check exercises public rendering, modal keyboard behavior, skip links, guest navigation, refresh and logout, chart controls, headers, client hydration under CSP, rejection of an unlisted script origin, asset MIME, and workspace shell/noindex behavior. Auth endpoints and dashboard chart data are intercepted for this browser test. The API suite uses signed test sessions and synthetic data for real authorization and persistence paths.
- **Feature coverage:** Existing API suites cover guest issuance/expiry, logout, Firebase verifier/exchange, finance access control, PDF and scan parsing, invalid input and upload limits, background jobs, transactions, recurring subscriptions, price changes, ledger and timeline totals, graph projections, merchant review, cancellation cases, and savings. Google OAuth end-to-end, live Firestore, real Brevo delivery, and external service deployment were not exercised. No claim of a real APK download is made.

```powershell
# From apps/web
npm run build
npm run lint
npx tsc --noEmit
npm start -- --hostname 127.0.0.1 --port 3031

# From the repo root, while the local production server is running
node scripts/check-remediation-browser.cjs
node scripts/check-commitments-select-names.cjs

# From apps/api, with the isolated test database configured
uv run --extra dev --locked pytest -q --tb=short
uv run --extra dev --locked pytest -q tests/test_security_remediation.py::test_authenticated_download_serves_real_pdf_with_pdf_mime
uv audit --locked --no-dev
```

## D. Security verification and residual checks

The local Next server emitted `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`, and `Referrer-Policy: strict-origin-when-cross-origin`. Its CSP included `frame-ancestors 'none'`, `object-src 'none'`, and `script-src-attr 'none'`. An HTTP request sent to the local test process with the production `Host` header emitted `Strict-Transport-Security: max-age=63072000`. The local hostname had no HSTS header.

- Removed credentialed wildcard matching of shared Render and Vercel hosting suffixes and unsafe substring matching of localhost from `app/core/auth.py` and `app/main.py`. Read-only checks found both previously named Vercel PayScope deployments. These and the production Render frontend keep exact production allowlist entries. Trusted custom origins still use the existing setting. The exception response now obtains the request origin and only reflects permitted values.
- Removed the source-known guest signing fallback. Production with guest login enabled refuses to start without a nondefault secret of sufficient length. The existing Render blueprint already provisions this setting. If an older deployment actually used the retired fallback, the owner should verify the current unique value or rotate it before release. Cookie flags, bearer claims, timeouts, and authenticated route contracts stay as deployed.
- Reviewed owner scoping, parameter binding, React rendering of imported strings, CSV formula escaping, import limits and content validation, OCR resource limits, rate limits, and generic error handling. No changes to data access grants, files, migrations, or externally hosted settings were made. The current solution is not a substitute for a later scoped penetration test.
- Web production audit (`npm audit --omit=dev --json`) listed zero advisories. The locked API audit reported zero known vulnerabilities or adverse statuses for the packages checked.
- The configured Neon connections request TLS. A read-only catalog check on the dedicated test role showed `CREATEROLE`, `CREATEDB`, and `BYPASSRLS` capabilities. Production credentials and role grants were not inspected. Before using a comparable role in production, verify the running role uses only needed database privileges, without broad administrative capabilities, and keep migrations on a separate role when practical. No role configuration was changed.
- In the Firebase console, verify the three in-use web deployment domains plus approved preview domains, confirm the repo owner rules are deployed if Firestore notes are on, check key API restrictions, and check that there are no unnecessary service grants. The `storageBucket` value is client configuration. No Firebase Storage SDK use or repo Storage rules were found. App Check was left unchanged pending provider testing. [Firebase API keys](https://firebase.google.com/docs/projects/api-keys)

## E. Accessibility evidence

Axe 4.14.0 reproduced landing consent contrast 3.20:1, heading order, and content outside a landmark. It also found About/Privacy skip link failures, public card heading errors, and contrast in Subscriptions navigation/discovery. The current browser check passed `color-contrast`, `heading-order`, `region`, `skip-link`, and `select-name` at the checked states. Those include desktop Home, About, Privacy, Subscriptions, the opened public dialogs, the consent hover state, and Home at 768px and 390px. Keyboard checks confirmed focus movement to public skip targets, the locked dashboard's main landmark, and modal focus return. These targeted checks do not establish complete WCAG 2.2 AA conformance.

## F. SEO evidence

Local HTML has the public-only canonical and share metadata. The XML sitemap contains exactly `/`, `/about`, and `/privacy`. The robots file links to that sitemap. Non-public workspace shell paths carry `noindex` and API access stays protected. Public production `robots.txt` and `sitemap.xml` returned 404 before remediation was deployed.

## G. Performance

On one headless local navigation per route, the baseline versus remediation HTML navigation transfers were 5,607 → 5,953 bytes for home, 6,317 → 6,713 for About, 6,298 → 6,694 for Privacy, and 6,193 → 6,196 for Subscriptions. These are smoke measurements, including HTML and response overhead. The baseline had a cold optimized image load, so single-run load times do not establish a performance gain. Existing public pages remain statically prerendered and no runtime dependency or external blocking script was added. Measure production performance again after deployment.

## H. Deploy and verify

1. Review the `payscope/remediation` diff against `7705a72` and deploy the frontend and API to staging or production. Keep the existing Render blueprint. Any extra trusted preview frontend must already be explicitly allowed in the API runtime configuration. [Render web services](https://render.com/docs/web-services)
2. Verify the six HTTP headers with `curl -I https://payscope-web.onrender.com/` and check HTTP 301 → HTTPS without a redirect loop. Verify `/sitemap.xml`, `/robots.txt`, and the canonical/social tags on all three public pages.
3. Use an authorized test account to complete Firebase popup sign-in, reload, and logout. Verify a synthetic bank statement upload, payment view, comparison, and notes if cloud notes are enabled. Watch browser CSP violations before promoting staging.
4. Rerun the authenticated/public ArgosX scan as applicable. Keep the score with scan timestamp and URL.

To reverse code in a deployed release, revert the remediation commits on the deployment branch and redeploy both services. A browser that already cached HSTS requires an HTTPS response with `Strict-Transport-Security: max-age=0` to clear that policy when a rollback explicitly calls for it.

## I. Remaining issues

- Render deployment and post-deployment ArgosX and performance checks.
- Firebase console, real OAuth, and deployed Firestore rules verification; Neon production-role verification.
- Authoritative HTTPS coverage of all affected child hostnames before adding HSTS `includeSubDomains`.
- A stricter nonce/hash policy remains a follow-up if the static rendering or production compatibility constraints can be met.

## J. Final score

No new ArgosX score was measured. Last owner-reported score: **81/100**. A verified **100/100** cannot be claimed before deployment and independent scanning.
