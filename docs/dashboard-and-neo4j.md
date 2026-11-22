# Dashboard and relationship intelligence

The dashboard uses PostgreSQL for financial calculations and Neo4j as a derived relationship projection. The graph does not replace the source ledger.

## Run locally

From `apps/api`, run `.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. From `apps/web`, run `npm run dev`. Local frontend API variables in `.env.local` should point to `http://127.0.0.1:8000`.

Sign in with Google or open an isolated guest workspace. The API uses the verified identity to choose the workspace. Upload a statement to populate its graph. Guest workspaces with no imports return an empty live graph.

## Neo4j configuration

Use the existing Aura instance, or create one through the [Aura console](https://neo4j.com/docs/aura/getting-started/create-instance/). Set `NEO4J_ENABLED=true`, `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` in the backend environment or `apps/api/.env`. Existing deployments can continue using `NEO4J_USERNAME`. Set `NEO4J_DATABASE` if the database name differs from the default. Put the same variables in the Render API service settings for a deployment. Enable `NEO4J_REQUIRED` if API startup should fail when Aura cannot connect. Optional mode logs the connection failure and keeps PostgreSQL operations available.

Run the additive graph schema migration from `apps/api` before enabling import or sync in a new environment. The command is safe to rerun and does not delete existing data.

```powershell
uv run --locked python -m app.graph.schema
```

Public TLS endpoints use the maintained Mozilla CA bundle from `certifi`. Certificate validation and hostname checks stay enabled; this also handles Windows machines whose system trust store lacks the endpoint's certificate chain. The configured secure URI is retained; the driver uses its explicit encrypted connection configuration to load that CA bundle.

New imports sync automatically after the PostgreSQL commit and local analysis. For existing imports, open **Relationships** and click **Sync Neo4j** once. Opening the graph only reads it. Source rows are projected with parameterized `UNWIND` batches of 500 by default.

Sync covers users, accounts, merchants, descriptor aliases, commitments, transactions, insights, evidence, and cancellation events. It includes `OWNS_ACCOUNT`, `HAS_TRANSACTION`, `PAID_TO`, `HAS_DESCRIPTOR`, `HAS_COMMITMENT`, `ASSOCIATED_WITH`, `SUPPORTED_BY`, `HAS_INSIGHT`, `EVIDENCED_BY`, and cancellation links. Stale workspace-owned projection records are cleaned only after a successful full pass. The source database is not modified by graph synchronization.

`GET /api/v1/graph` reads AuraDB and serves the **Relationships** page. It returns empty arrays for new workspaces and an explicit error if the live graph is disabled, unavailable, or behind the user's saved imports. The summary counts the nodes and relationships in the current workspace's snapshot. A separate legacy explorer path can still return explicitly labelled PostgreSQL data when Neo4j is disabled. A successful sync invalidates relationship snapshots.

The **Merchants** view shows successful statement debits through `Account → PAYS → Merchant`, statement descriptors and computed `SIMILAR_DESCRIPTOR` edges, and observed `Mandate` nodes when the original file supplies a mandate reference. Related open alerts come from existing evidence links. Mandate IDs are scoped to the workspace and account, and display only the final characters of the source reference. Similarity uses token overlap on descriptors read from Neo4j. It links related names for review and does not change source transactions or merge balances.

## Import updates

Successful imports now run recurring-payment discovery and insight detection against the authenticated workspace before synchronizing its Neo4j projection. Statement rows receive a reusable “Imported statements” source account, so account → transaction → merchant and commitment → evidence paths remain connected. Duplicate-only imports rerun the idempotent analysis and sync, allowing recovery without duplicate records.

The import response includes `workspace_refresh` with separate analysis and graph statuses. Saved imports survive analysis or Neo4j failures. Retry through `POST /api/v1/imports/{id}/refresh` or **Sync Neo4j**. Live reads refuse to serve a projection marked as incomplete or older than the newest saved statement.

After a successful upload the browser invalidates its account-scoped snapshots. Dashboard financial metrics continue to come directly from PostgreSQL.

## Gemini review with graph evidence

Open the subscription report on Overview and choose **Review with Neo4j and Gemini**. On confirmation the API makes a scoped Cypher read for the selected eligible debits. Gemini receives redacted descriptions, dates, amounts, and live merchant context with account counts, transaction counts, mandate counts, and existing alert types. Raw statement files, full mandate references, account IDs, and credentials are excluded from the prompt. The resulting cited highlights are saved separately from the deterministic statement analysis and do not change subscriptions or calculated totals. An unavailable provider or graph returns an error instead of a generated substitute.

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

From `apps/api`, using the configured Aura and Gemini credentials plus `TEST_DATABASE_URL` for the isolated `mandatelens_test` database:

```powershell
uv run --extra dev --locked python ../../scripts/verify_neo4j_aura.py --live
```

This verification makes real database and provider calls. It imports synthetic statements through FastAPI, compares two isolated workspace graphs, checks that the schema is idempotent, and captures the actual graph context sent to Gemini. It deletes only the temporary workspace records it creates. Expected test data may appear in the test debug output.

For the optional live browser check, run `npm run dev -- --hostname 127.0.0.1 --port 3031` from `apps/web` with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8812`. Then add `--browser` to the verification command. The verification launches the isolated API on port 8812 and opens the actual page in two fresh browser sessions.
