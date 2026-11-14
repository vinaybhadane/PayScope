# PayScope

Recurring payment intelligence for synthetic bank statements and payment notifications.

PayScope includes a Next.js frontend, FastAPI backend, PostgreSQL ledger, and an optional Neo4j relationship projection. It discovers recurring commitments, highlights price changes, estimates spending and savings, and provides cancellation guidance. It does not execute cancellations or connect to live bank accounts.

## Local setup

Requirements: Node.js 20+, Python 3.11+, and PostgreSQL 16. Neo4j is optional.

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

Set frontend API variables to `http://127.0.0.1:8000`. Fill in Firebase public client settings for Google sign-in. Open [PayScope](http://127.0.0.1:3000). The app uses pale sage ivory `#E5E8CE` and muted forest sage `#789575` across the landing page and workspace.

## Authentication and workspace isolation

All financial, import, graph, and mutation APIs require `Authorization: Bearer <token>`. Google users send Firebase ID tokens; the server maps each verified subject to its own persistent workspace. Guest sessions use a signed token with a 24-hour expiry and an isolated workspace, stored in the browser tab. Set `ALLOW_GUEST_SESSIONS=false` to disable guest access. Never reuse a session signing secret between environments.

`POST /api/v1/auth/guest` creates a guest session. `GET /api/v1/auth/me` returns the authenticated workspace ID. Caller-supplied `user_id` values must match this ID. Source queries, record lookups, writes, and read caches are scoped to that workspace. Merchant reference data is shared; user-created aliases are private and curated aliases are read-only.

The sample workspace is illustrative data stored in the frontend. **Connected** displays the authenticated API workspace, which starts empty. Import synthetic records or use authenticated `POST /api/v1/demo/seed` to populate it. Public sample downloads and health/readiness checks require no session.

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

Configure database credentials, `API_SESSION_SECRET`, `FIREBASE_PROJECT_ID`, allowed frontend origins, and optional Neo4j credentials in your hosting secret store. Do not commit `.env` files. The Render blueprint generates a guest signing secret and requires Firebase/database configuration. Deploy the frontend with the corresponding Firebase project and backend URL.
