# PayScope

Statement-based payment tracking and recurring-payment analysis for bank statements and payment notifications.

PayScope includes a Next.js frontend, FastAPI backend, PostgreSQL ledger, and an optional Neo4j relationship projection. It discovers recurring commitments, highlights price changes, estimates spending and savings, and provides cancellation guidance. It does not execute cancellations or connect to live bank accounts.

## Local setup

Requirements: Node.js 24.12+, Python 3.11+, and PostgreSQL 16. Neo4j is optional.

1. Copy `.env.example` to `apps/api/.env`. Set database credentials and a unique `API_SESSION_SECRET` of at least 32 characters. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
2. Create the PostgreSQL databases `mandatelens` and `mandatelens_test` with the configured database user. Keep `TEST_DATABASE_URL` pointed at the separate test database; tests truncate its tables.
3. For Google sign-in, set backend `FIREBASE_PROJECT_ID` to the same Firebase project used by the frontend. Enable Google in Firebase Authentication and authorize your frontend domain. ID tokens are verified against Google's public certificates, expected issuer, audience, and expiry. See [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
4. To run PostgreSQL and optional Neo4j with Docker, copy the backend environment to the root `.env` and run `docker compose up -d`. Use matching passwords and database names in both files.

Start the backend:

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[dev]"
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Alternatively, install uv and run `uv sync --extra dev`, then `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`.

Migrations finish before the API accepts traffic. Migration failures stop startup. Set `RUN_MIGRATIONS=false` only when your deployment runs `alembic upgrade head` separately before starting the API. Run one migration job before starting multiple production workers.

Start the frontend in another terminal:

```powershell
cd apps/web
Copy-Item .env.local.example .env.local
npm ci
npm run dev
```

Set frontend `API_BASE_URL` to `http://127.0.0.1:8000`. Fill in Firebase public client settings for Google sign-in. Open [PayScope](http://localhost:3000). The app uses pale sage ivory `#E5E8CE` and muted forest sage `#789575` across the landing page and workspace.

## Authentication and workspace isolation

Financial, import, graph, and workspace mutation APIs require a verified session. The server issues a `payscope_token` cookie with `HttpOnly`, `Secure`, and `SameSite=None` to support the existing separate frontend and API origins. Guest sessions expire after 24 hours and have isolated workspaces. The guest response also includes a signed bearer token for browsers that block third-party cookies. PayScope keeps that token in session storage and clears it at logout. Google users exchange a verified Firebase ID token at `POST /api/v1/auth/session`. Set `ALLOW_GUEST_SESSIONS=false` to disable guest access. Production guest sessions require a unique `API_SESSION_SECRET` of at least 32 characters.

Set `API_BASE_URL` on the frontend server for the Next.js `/api/v1` proxy. The public API URL settings also support direct requests. Cookie-authenticated writes require an exact allowed `Origin`. Production retains the known PayScope Render and Vercel origins. Add each trusted staging or preview origin explicitly to `BACKEND_CORS_ORIGINS`. Wildcards and automatic matching of hosting provider subdomains are disabled. Keep production HTTPS enabled. Use `localhost` for HTTP development if your browser does not accept Secure cookies on `127.0.0.1`, or run local HTTPS.

`POST /api/v1/auth/guest` creates a guest session. `GET /api/v1/auth/me` returns the authenticated workspace ID. Caller-supplied `user_id` values must match this ID. Source queries, record lookups, writes, and read caches are scoped to that workspace. Merchant reference data is shared; user-created aliases are private and curated aliases are read-only.

Only guest creation, health, and synthetic sample-file listings/downloads are public within the API router. Readiness requires authentication; hosting liveness probes should use `/api/v1/health`. Guest creation is limited to 5 requests/minute per remote IP; preview and import uploads are limited to 10/minute each. Exceeding a limit returns JSON `429` with `Retry-After`. The default limiter is process-local. Use one API worker per instance; configure `RATE_LIMIT_STORAGE_URI=redis://...` for a shared quota across instances, and configure trusted reverse-proxy addresses on your ASGI host so client IPs cannot be spoofed.

PDF/image previews and imports return `202` with a `job_id`. Poll `GET /api/v1/imports/jobs/{job_id}` for the owner-scoped result. A dedicated OCR worker accepts at most four active/pending jobs to bound memory usage; excess submissions return `429`. Results expire after 15 minutes. The queue is in-process: use one API process per instance, retry interrupted jobs after restarts, and replace it with a shared durable broker before scaling to multiple workers/instances. Images are capped at 15 million pixels. PDF rendering is capped at 15 million pixels per page and 60 million per document, with at most 15 scanned pages per import. Windows OCR is used on Windows. Other hosts need Tesseract with English language data installed on PATH; hosts without an OCR engine return an actionable error for scanned uploads.

Bank-statement amounts and recurrence analysis use deterministic local rules. No Gemini key is needed for imports, payment tracking, subscription discovery or dashboard totals. Suspected instruction payloads and low-confidence OCR records go to manual review. Legitimate bank terms such as Standing Instruction are accepted. CSV and XLSX exports sanitize string cells against spreadsheet formulas.

Payment insights compares two imported statements using completed payments in each source file. It shows cash flow by currency, new payees or payers, new recurring patterns, changes in observed subscription charges, and documented closures. A charge missing from the later file is marked as not seen. Explicit statement closure rows need a mandate reference that uniquely links to a prior recurring payment. User recorded cancellations appear separately. Overlap is shown in the comparison, and the ledger deduplicates shared payments. Older files imported before overlap tracking may need to be uploaded again if duplicate rows cannot be linked to the file.

Choose **Explain with Gemini** to generate plain language highlights. Configure `GEMINI_API_KEY` and `GEMINI_MODEL` in the API environment. The request contains calculated amounts and change types, without names, file contents, account references, or filenames. The exact comparison is still available when the provider is unavailable.

Guest and signed-in workspaces start empty. Guest sessions are isolated and expire after 24 hours. There is no automatic demo seeding or sample-value fallback in dashboard resources. Example downloads are optional and are imported only when explicitly uploaded.

Credentialed CORS uses the same exact allowlist as cookie mutation checks. Unexpected server errors return a generic message, with diagnostic details left in server logs.

## Imports

Upload a bank statement up to 10 MB. `synthetic_confirmed` is retained for compatibility and source tagging; it is not required for real statements.

- CSV supports BOM/UTF-16, delimiter detection, metadata before the header and column mapping.
- Excel supports XLSX and XLS, all statement worksheets, differing sheet headers and bank metadata. Formula cells must have saved calculated values.
- PDF supports ruled tables, selectable text and mixed selectable/scanned pages. Source page numbers are preserved. Password-protected documents must be unlocked before import.
- JPG/JPEG, PNG and WEBP use OCR. Windows uses Windows OCR; other hosts need the Tesseract executable with English language data installed and on PATH. `pytesseract` alone does not install that executable.
- JSON supports payment notification imports.

Date, description and an amount or debit/credit columns are required. Preview exposes the date order (Indian day/month/year by default), signed amount convention, debit/credit direction, duplicates and per-row errors. Split debit/credit columns take priority. Invalid directions, conflicting amounts and ambiguous text extraction are reported rather than guessed. Every accepted transaction retains its source row and extracted evidence.

Preview with `POST /api/v1/imports/preview`, then persist with `POST /api/v1/imports`. Both accept multipart `file`, `import_type` and optional JSON `column_overrides`. PDF/image processing and imports requested in the background return `202`; poll the owner-scoped job endpoint. A successful import rebuilds recurring payments, insights, dashboard totals, savings scenarios and relationship data, then invalidates workspace read caches. A failed analysis can be retried without importing the payments again.

Payments lists every imported debit and credit, with separate exact totals for each currency. INR dashboard/financial totals never add other currencies. The subscription report and payment ledger retain other currencies. Recurrence, annual costs, future dates and hypothetical cancellation savings are estimates from payment history; no statement-only system can verify service usage or actual mandate status.

Repeated imports skip stable payment IDs regardless of filename or row ordering. Without a bank reference, identical payments in overlapping exports may require review. Unreadable OCR, lost column alignment and unsupported layouts require a corrected file or CSV/Excel export. There is no claim of universal 100% OCR accuracy.

## API and graph

- Liveness: `/api/v1/health`
- Database readiness: `/api/v1/ready`
- Interactive API documentation: `/api/v1/docs` (use Authorize with a session token)
- Dashboard: `/api/v1/dashboard/summary`
- Payment ledger: `/api/v1/transactions`
- Commitments: `/api/v1/commitments`
- Insights: `/api/v1/insights`
- Graph overview: `/api/v1/graph/explorer`
- Graph sync: `POST /api/v1/graph/sync`

To enable the live Relationships tab, configure the backend-only Aura URI, user and password, run the graph schema migration, and set `NEO4J_ENABLED=true`. Imports sync automatically. Existing imports can be projected through **Sync Neo4j**. See [dashboard and graph setup](docs/dashboard-and-neo4j.md) for the live Gemini review and verification commands.

Notes stay in a local browser cache when Firestore is unavailable. Deploy `firestore.rules` to enforce ownership before enabling cloud notes.

## Checks

```powershell
cd apps/api
.venv\Scripts\python.exe -m pytest -q
```

The suite migrates and cleans only the configured `mandatelens_test` database. Authentication tests exercise signed guest sessions, invalid and expired tokens, cross-workspace access, and Firebase verifier boundaries. PDF tests cover table extraction and unsupported documents.

```powershell
cd apps/web
npm run lint
npx tsc --noEmit
npm run build
```

Browser smoke checks are in `scripts/check-sage-theme.cjs`. Run with both development servers available using `node scripts/check-sage-theme.cjs`.

## Deployment

Set `ENVIRONMENT=production` and supply `POSTGRES_PASSWORD` and `DATABASE_URL` through environment variables or your secret manager. Production startup rejects the repository's development password and placeholder credentials, including defaults embedded in `DATABASE_URL`; development retains its local defaults. Configure `API_SESSION_SECRET`, `FIREBASE_PROJECT_ID`, allowed frontend origins, and optional Neo4j credentials in your hosting secret store. Do not commit `.env` files. The Render blueprint supplies the managed database password, generates a guest signing secret, and requires Firebase/database configuration. Deploy the frontend with the corresponding Firebase project and server-side `API_BASE_URL`.

### Deploy the full stack to Render

The root `render.yaml` defines the Next.js web service, FastAPI service, and managed PostgreSQL database on Render's free plans. Create a Blueprint from this repository in Render. Free web services sleep after inactivity and can take time to wake; the free Postgres database is limited to 1 GB, has no backups, and expires 30 days after creation. Treat this as a prototype deployment and export any data you want to keep before expiration. See Render's [free plan limits](https://render.com/docs/free).

During the initial Blueprint setup, Render prompts for the `sync: false` variables. Copy the matching values from your untracked `apps/api/.env` and `apps/web/.env.local` files into Render's secret fields. The API needs `FIREBASE_PROJECT_ID` and `GEMINI_API_KEY` for Google sign-in and AI review. Email reminders need `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL`. The frontend's six `NEXT_PUBLIC_FIREBASE_*` values must come from the same Firebase web app as `FIREBASE_PROJECT_ID`.

After the first deploy, add the `payscope-web.onrender.com` domain to Firebase Authentication's authorized domains. If you use Firestore for notes, deploy `firestore.rules` to that Firebase project. Confirm the API's `/api/v1/ready` health check succeeds, then open the frontend service URL and try a guest session or Google sign-in. Keep `.env` files and secret values out of Git.
