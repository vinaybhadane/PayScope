# PayScope API

FastAPI backend for recurring payment intelligence. See the repository [README](../../README.md) for database setup, Firebase configuration, guest sessions, supported imports, and deployment.

```powershell
# From apps/api
uv sync --extra dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Migrations complete before startup. All workspace APIs require a verified Firebase ID token or signed guest token in the Authorization bearer header. Public endpoints include health, readiness, guest session creation, and synthetic sample downloads.

AI review and email configuration (backend `.env` only):

```dotenv
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-3.5-flash-lite
BREVO_API_KEY=your-server-side-key
BREVO_SENDER_EMAIL=patilsakshi18027@gmail.com
EMAIL_WORKER_ENABLED=true
EMAIL_REMINDER_INTERVAL_SECONDS=3600
```

Uploads save validated records, then run Gemini review. A subscription requires at least two owned debit records on different dates consistent with the reviewed cadence. If the provider fails or evidence validation fails, the file stays saved and no unreviewed subscription is published; retry from Overview or the import result. AI generates product names, categories, explanations, insights and savings recommendations. Financial calculations use recorded amounts. Overview totals and the simulator currently aggregate INR only; reports list other currencies separately. Reviews are limited to 3,000 debit records per workspace.

Overview provides AI review, PDF download, email settings and complete workspace clearing. PDF report emails and 5/3/1-day reminders use the verified email claim from Firebase login; guests cannot send mail. A new signed-in uploader gets report emails and reminders enabled, with controls to disable either. The sender must be active in the Brevo account. Keys never go to browser code.

The backend lifespan starts a durable email outbox worker. It scans hourly, claims work under a database lock, deduplicates each subscription/date/reminder threshold, and records provider acceptance or errors. Keep at least one API process running continuously for timely reminders; sleeping hosts cannot guarantee schedules. Payment dates are estimates from the last observed payment and cadence. Unknown provider acceptance is recorded as `uncertain` for operator review rather than blindly resent. Review email status under Overview's email controls.

Run isolated AI/evidence and reminder checks without database access or real email:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s checks -v
```

```powershell
uv run pytest -q
```

Tests use the separately configured `mandatelens_test` database and never migrate the application database. They override identities only for legacy domain tests; authentication tests use real signed guest sessions.

Previously saved commitments remain readable after the AI rollout. Workspaces without an AI report can still calculate savings from their persisted legacy evidence. Once a workspace has an AI review state, its recommendations come from that review; failed new uploads never fall back to legacy detection. Automated tests replace the external review boundary only for pre-AI synthetic lifecycle fixtures.
