# PayScope API

FastAPI backend for recurring payment intelligence. See the repository [README](../../README.md) for database setup, Firebase configuration, guest sessions, supported imports, and deployment.

```powershell
# From apps/api
uv sync --extra dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Migrations complete before startup. All workspace APIs require a verified Firebase ID token or signed guest token in the Authorization bearer header. Public endpoints include health, readiness, guest session creation, and synthetic sample downloads.

```powershell
uv run pytest -q
```

Tests use the separately configured `mandatelens_test` database and never migrate the application database. They override identities only for legacy domain tests; authentication tests use real signed guest sessions.
