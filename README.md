# PayScope

Recurring payment intelligence for synthetic bank statements and payment notifications.

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

All financial, import, graph, and mutation APIs require a verified session. The browser uses a server-issued `payscope_token` cookie with `HttpOnly`, `Secure`, and `SameSite=Strict`. Guest sessions expire after 24 hours and have isolated workspaces. Google users exchange a verified Firebase ID token at `POST /api/v1/auth/session` for the cookie. API clients can also use `Authorization: Bearer <token>`. No guest token is returned in JSON or stored in browser storage. Set `ALLOW_GUEST_SESSIONS=false` to disable guest access. Never reuse a session signing secret between environments.

Browser requests use the Next.js `/api/v1` proxy. Set `API_BASE_URL` on the frontend server to the backend upstream (the legacy `NEXT_PUBLIC_API_BASE_URL` is also supported). Keep production HTTPS enabled. This makes browser API requests same-origin even when the backend is on a different hosting domain, so Strict cookies work without third-party cookies. Cookie-authenticated writes require an exact allowed `Origin`; cross-site writes are rejected. Configure `BACKEND_CORS_ORIGINS` as an explicit list of frontend origins. Wildcards and automatic preview-domain matching are disabled. Add individual preview origins only when trusted. Credentialed CORS is enabled. Use `localhost` for HTTP development if your browser does not accept Secure cookies on `127.0.0.1`, or run local HTTPS.

`POST /api/v1/auth/guest` creates a guest session. `GET /api/v1/auth/me` returns the authenticated workspace ID. Caller-supplied `user_id` values must match this ID. Source queries, record lookups, writes, and read caches are scoped to that workspace. Merchant reference data is shared; user-created aliases are private and curated aliases are read-only.

Only guest creation, health, and synthetic sample-file listings/downloads are public within the API router. Readiness requires authentication; hosting liveness probes should use `/api/v1/health`. Guest creation is limited to 5 requests/minute per remote IP; preview and import uploads are limited to 10/minute each. Exceeding a limit returns JSON `429` with `Retry-After`. The default limiter is process-local. Use one API worker per instance; configure `RATE_LIMIT_STORAGE_URI=redis://...` for a shared quota across instances, and configure trusted reverse-proxy addresses on your ASGI host so client IPs cannot be spoofed.

PDF/image previews and imports return `202` with a `job_id`. Poll `GET /api/v1/imports/jobs/{job_id}` for the owner-scoped result. A dedicated OCR worker accepts at most four active/pending jobs to bound memory usage; excess submissions return `429`. Results expire after 15 minutes. The queue is in-process: use one API process per instance, retry interrupted jobs after restarts, and replace it with a shared durable broker before scaling to multiple workers/instances. Images are capped at 15 million pixels. PDF rendering is capped at 15 million pixels per page and 60 million per document, with at most 15 scanned pages per import. Native OCR currently requires Windows; hosts without the engine return an actionable error for scanned uploads, while selectable-text PDFs work normally.

OCR records with invisible/private-use characters, instruction-like descriptors, invalid schemas, descriptors over 120 characters, or available confidence scores below 80% go to the manual-review queue and are excluded from automated analysis. Descriptors containing “instruction” require review, including the bank phrase “Standing Instruction”; canonical rail metadata generated by the parser remains allowed. Quarantine logs contain source hashes and reason codes; owner-scoped review entries retain the extracted evidence for inspection. Correct the source data and re-upload to include a quarantined record. Gemini receives only allow-listed evidence fields after account/IFSC/UPI redaction inside untrusted-data delimiters. Invalid responses, extra fields, or URLs trigger the local deterministic auditor. CSV and XLSX exports sanitize every string cell against spreadsheet formulas.

The guest sample workspace uses predefined synthetic records. Google-authenticated workspaces start empty; import synthetic records to populate them. Public sample downloads and health/readiness checks require no session.

Guest demo entry seeds six predefined subscriptions into its isolated API workspace: Netflix, Amazon Prime, YouTube Premium, ChatGPT Plus, Claude Pro, and Gemini Pro. The dashboard and subscription list read the same records. Sample INR amounts are illustrative and are not current plan prices. Guest analysis uses built-in rules and predefined report text without calling Gemini; Google-authenticated workspaces continue to use the existing AI review flow. Company logos are served locally and fall back to an initial when unavailable. The relationship overview follows Account → Subscription → Company; Payment evidence focuses on one subscription's recorded payments.

CORS allows configured origins only. Set `BACKEND_CORS_ORIGINS` for your frontend host and remove unused production defaults when deploying. Unexpected server errors return a generic message; details stay in server logs.

## Imports

Only synthetic data is supported. Uploads require `synthetic_confirmed=true` and are limited to 10 MB.

- CSV and XLSX statements support column mapping and preview.
- JSON supports simulated payment notifications.
- PDF supports selectable-text statement tables with date, description, and amount columns, up to 100 pages. Scans and image-only PDFs require OCR and are rejected with guidance to export CSV/XLSX. Arbitrary bank PDF layouts may require column mapping or a CSV export.

Preview with `POST /api/v1/imports/preview`; persist with `POST /api/v1/imports`. Both accept multipart `file`, `import_type`, `synthetic_confirmed`, and optional JSON `column_overrides`. List imports with `GET /api/v1/imports`.

## API and graph

- Liveness: `/api/v1/health`
- Database readiness: `/api/v1/ready`
- Interactive API documentation: `/api/v1/docs` (use Authorize with a session token)
- Dashboard: `/api/v1/dashboard/summary`
- Commitments: `/api/v1/commitments`
- Insights: `/api/v1/insights`
- Graph overview: `/api/v1/graph/explorer`
- Graph sync: `POST /api/v1/graph/sync`

Set `NEO4J_ENABLED=false` to use the PostgreSQL relationship projection. When enabled, set the backend-only URI, username, password, and database, then sync your workspace explicitly. See [dashboard and graph behavior](docs/dashboard-and-neo4j.md).

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
