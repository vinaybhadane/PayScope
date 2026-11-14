# Dashboard and relationship intelligence

The dashboard uses PostgreSQL for financial calculations and Neo4j as a derived relationship projection. The graph does not replace the source ledger.

## Run locally

From `apps/api`, run `.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. From `apps/web`, run `npm run dev`. Local frontend API variables in `.env.local` should point to `http://127.0.0.1:8000`.

Sign in or open the demo. The header's **Sample / Connected** switch chooses between the labelled illustrative workspace and the authenticated API workspace. Connected requests carry a Firebase ID token or an isolated guest session token. The API resolves the verified identity to its own workspace; explicit workspace IDs must match it. Guest workspaces start empty until seeded or imported.

## Neo4j configuration

Set `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE` in `apps/api/.env`, then restart the backend. Aura normally uses a `neo4j+s://` connection URI. Credentials are never sent to the browser.

Public TLS endpoints use the maintained Mozilla CA bundle from `certifi`. Certificate validation and hostname checks stay enabled; this also handles Windows machines whose system trust store lacks the endpoint's certificate chain. The configured secure URI is retained; the driver uses its explicit encrypted connection configuration to load that CA bundle.

Open **Relationships**, choose **Connected**, then click **Sync Neo4j**. Sync creates idempotent constraints/indexes and projects workspace records with parameterized `UNWIND` batches. Source rows stream in batches of 500 by default. The sync is an explicit action; opening the dashboard never triggers a full synchronization.

Sync covers users, accounts, merchants, descriptor aliases, commitments, transactions, insights, evidence, and cancellation events. It includes `OWNS_ACCOUNT`, `HAS_TRANSACTION`, `PAID_TO`, `HAS_DESCRIPTOR`, `HAS_COMMITMENT`, `ASSOCIATED_WITH`, `SUPPORTED_BY`, `HAS_INSIGHT`, `EVIDENCED_BY`, and cancellation links. Stale workspace-owned projection records are cleaned only after a successful full pass. The source database is not modified by graph synchronization.

The graph view labels its actual source. If Neo4j is disabled, empty, or unreachable, it shows the PostgreSQL projection. An unreachable server opens a 30-second circuit so subsequent graph reads do not repeat the failing connection attempt. Successful sync resets that circuit and invalidates graph snapshots.

## Import updates

Successful imports now run recurring-payment discovery and insight detection against the authenticated workspace before synchronizing its Neo4j projection. Statement rows receive a reusable “Imported statements” source account, so account → transaction → merchant and commitment → evidence paths remain connected. Duplicate-only imports rerun the idempotent analysis and sync, allowing recovery without duplicate records.

The import response includes `workspace_refresh` with separate analysis and graph statuses. Saved imports survive analysis or Neo4j failures; the upload result offers a retry through `POST /api/v1/imports/{id}/refresh`. A failed graph refresh falls back to current SQL records instead of serving a projection older than the latest completed import. Neo4j must be enabled and reachable for a completed graph status.

After a successful upload the browser switches to Connected mode and invalidates its account-scoped snapshots. Dashboard metrics and relationship views fetch the stored records. `node scripts/check-import-refresh.cjs` verifies a synthetic upload through the browser against the configured local services, including a real Neo4j sync.

## Read performance

- Dashboard normalization runs once and is reused by savings and upcoming projections. Totals retain the existing confidence, cadence, verified-usage, and savings safeguards.
- The spending timeline is grouped in SQL. Insight counts, recent insights, cancellation counts, and pending review counts share one database round-trip. Recent insights and top commitments are bounded.
- Server caches are process-local, bounded, and coalesce simultaneous requests for a workspace. Dashboard TTL is 15 seconds; graph TTL is 20 seconds. Source commits invalidate these caches in the current worker. Other workers expire entries by TTL.
- Browser caches are memory-only, scoped by account and endpoint, and revalidate in the background. Requests time out after eight seconds instead of performing repeated 25-second retries. Existing snapshots remain visible after refresh failures.
- The relationship component and notes load separately from the dashboard's first render. The graph uses a deterministic SVG layout with no continuous physics loop. Sidebar prefetch is limited to overview and relationships.

The initial source probe made 46 SQL statements. The revised default workspace path makes 8, or 7 when an explicit workspace ID is supplied. In the read-only comparison, normalized spend and savings matched the existing financial summary. Timings depend on database wake-up and network conditions; the included probe reports current timings rather than an assumed guarantee.

## Reading the graph

**Overview** collapses transaction evidence into dashed account-to-commitment funding links. Those links are derived only when both the account/transaction and commitment/evidence relationships exist. **Evidence** displays the original transaction nodes and arrows. Select nodes for details; search pans to a match. Categories, zoom, keyboard selection, and mobile node details are supported. Reads cap commitment and evidence sets and report limited snapshots.

## Verification

From the repository root:

```powershell
apps\api\.venv\Scripts\python.exe -m pytest artifacts\test_dashboard_graph_performance.py -q
apps\api\.venv\Scripts\python.exe artifacts\verify_workspace_backend.py
node artifacts\dashboard-v2-check.cjs
```

The Python unit tests use mocks and do not access production fixtures. The comparison probe reads existing SQL records and mocks all Neo4j writes. A live Neo4j synchronization must still be checked against a reachable configured server; a mocked batching test does not verify a live Cypher execution.

The configured Aura instance was subsequently verified with a real sync: 365 nodes and 689 relationships, followed by a Neo4j overview read with valid edge endpoints. `Cypher 25` is the language version and is not part of the database name. The overview now uses explicit subquery scope clauses.
