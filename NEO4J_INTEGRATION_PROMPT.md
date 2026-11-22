# PayScope — Neo4j AuraDB Integration Task

**Purpose:** This file is a task specification for an implementing agent (human or AI coding agent, e.g. Claude Code) to wire a real, working Neo4j AuraDB Free instance into PayScope. It covers the three highest-value use cases for this project: merchant deduplication, the Relationship Graph screen, and grounding the AI review step with verified graph facts.

**Non-negotiable rule for the implementing agent:** Every piece of this must be a real, working integration against an actual Neo4j AuraDB Free instance. Do not simulate, mock, stub, or hardcode any part of it — not the connection, not the data, not the query results, not the API response. If something cannot be made to work for real in the time available, say so explicitly and leave it incomplete rather than faking it with placeholder data that looks real.

---

## 0. Setup — Real Connection, No Hardcoded Credentials

1. Create a Neo4j AuraDB Free instance at `console.neo4j.io`. Save the connection URI (`neo4j+s://...`) and the generated password immediately — it is shown only once.
2. Store `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` as environment variables (`.env`, loaded via the existing `config.py` / `pydantic-settings` pattern already used for `POSTGRES_*`). **Do not** write the URI, username, or password as a literal string anywhere in the codebase.
3. Create a single driver instance at application startup (FastAPI `lifespan` or `@app.on_event("startup")`), and close it on shutdown:
   ```python
   from neo4j import GraphDatabase

   driver = GraphDatabase.driver(
       settings.NEO4J_URI,
       auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
   )
   ```
4. Call `driver.verify_connectivity()` at startup. If it fails, the application must log a clear, specific error and either refuse to start (if Neo4j is required for the current environment) or clearly mark graph-dependent features as unavailable — it must never silently fall back to fabricated graph data to hide the failure.

**Acceptance check:** Starting the backend with a deliberately wrong password in the environment must produce a visible connection error in the logs, not a silent success.

---

## 1. Schema and Constraints (Run Once, Not Hardcoded Into Query Logic)

Run these once against the real instance (a migration script, not inline in request-handling code):

```cypher
CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT merchant_id IF NOT EXISTS FOR (m:Merchant) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT mandate_ref IF NOT EXISTS FOR (ma:Mandate) REQUIRE ma.reference IS UNIQUE;
```

**Acceptance check:** Re-running the migration script a second time must not error and must not create duplicate constraints (the `IF NOT EXISTS` guard must actually be exercised, not assumed).

---

## 2. Use Case A — Merchant Deduplication From Real Transaction Data

**Goal:** When a statement is imported, write real accounts, merchants, and mandates into Neo4j from the transactions that were actually parsed — not from a fixed list of sample merchants.

1. After a successful import commits transactions to PostgreSQL (the existing `POST /imports` flow), add a step that pushes the same batch into Neo4j using `UNWIND` for bulk writes, not one `CREATE` per row:
   ```cypher
   UNWIND $rows AS row
   MERGE (a:Account {id: row.accountId})
   MERGE (m:Merchant {rawDescriptor: row.descriptor})
   MERGE (ma:Mandate {reference: row.mandateRef})
   MERGE (a)-[:PAYS]->(m)
   MERGE (m)-[:HAS_MANDATE]->(ma)
   ```
   `$rows` must be built from the actual parsed transaction records for that import, passed as driver parameters — never a hardcoded sample array.
2. Implement merchant similarity grouping using Neo4j's Graph Data Science library (`gds.nodeSimilarity`) or, if GDS is not available on the Free tier instance, a deterministic token-overlap comparison run in Cypher/Python against the real `rawDescriptor` values already stored. Either way, the similarity score must be computed from the data actually in the graph, not returned as a fixed number.

**Acceptance check:** Importing two different real test statements that both contain "NETFLIX.COM" and "NETFLIX ENTM" must result in the two descriptors being linked or grouped by the similarity step, demonstrated by a Cypher query run against the live instance — not by a unit test that mocks the driver.

---

## 3. Use Case B — Relationship Graph Screen Backed by Live Queries

**Goal:** The existing `/relationships` page and its `GET /api/v1/graph` endpoint must render whatever is actually in Neo4j for the current user, not a fixed sample graph.

1. Implement the endpoint to run a real Cypher query scoped to the requesting user's accounts:
   ```cypher
   MATCH (a:Account {ownerId: $userId})-[:PAYS]->(m:Merchant)-[:HAS_MANDATE]->(ma:Mandate)
   OPTIONAL MATCH (ma)-[:FLAGGED_AS]->(r:RiskAlert)
   RETURN a, m, ma, r
   ```
2. Map the returned nodes and relationships into the JSON shape the frontend graph component expects, built from the query result — not a hardcoded JSON fixture left over from frontend development.
3. If the query returns zero results for a user with no data yet, the API must return an empty graph structure, not a sample/demo graph used as a fallback.

**Acceptance check:** Creating a second test account with different transactions and loading its Relationship Graph must show a visibly different graph from the first account's — proving the data is live and user-scoped, not a shared static response.

---

## 4. Use Case C — Grounding the AI Review With Real Graph Facts

**Goal:** Before a transaction record is sent to Gemini for review, attach a short, factual summary pulled from Neo4j about that merchant/mandate — replacing or supplementing the raw-text-only payload currently sent in `ai_review.py`.

1. Before calling Gemini, run a real query for the merchant in question:
   ```cypher
   MATCH (m:Merchant {id: $merchantId})<-[:PAYS]-(a:Account)
   OPTIONAL MATCH (m)-[:HAS_MANDATE]->(ma:Mandate)-[:FLAGGED_AS]->(r:RiskAlert)
   RETURN count(DISTINCT a) AS accountCount, collect(DISTINCT r.type) AS existingFlags
   ```
2. Include the real result (e.g. `accountCount`, `existingFlags`) in the prompt sent to Gemini, inside the existing `<untrusted_transactions>`-style delimiters, clearly labelled as graph-derived context distinct from the raw transaction text.
3. This must run against the live instance per request (or per batch) — it must not be a fixed context string written once and reused for every merchant.

**Acceptance check:** Two different merchants with different graph histories must produce two different context blocks sent to Gemini, verifiable by logging the actual outgoing payload in a test run.

---

## 5. What Counts as "Hardcoded" (Do Not Do Any of This)

- A Neo4j URI, username, or password typed directly into source code, even "temporarily."
- A Python function named like a real query (`get_merchant_graph`, `resolve_merchant_duplicates`) that actually returns a fixed dictionary or list instead of calling the driver.
- Seed/sample nodes left in the database that the API quietly falls back to when a real query returns nothing, without telling the user the data is empty.
- A `/api/v1/graph` response that is the same for every user regardless of their actual transactions.
- Catching a Neo4j connection error and silently returning fabricated graph data instead of a clear error or empty state.

---

## Completion Gate

**This task is not complete until all of the following are true, with no exceptions:**

- [ ] Real AuraDB Free instance created; credentials are environment variables only, never in source code
- [ ] Driver connectivity is verified at startup with visible failure on bad credentials
- [ ] Schema constraints applied and confirmed idempotent on re-run
- [ ] Merchant/account/mandate data written into Neo4j from real import data (Use Case A) — verified by querying the live instance after a real import
- [ ] Merchant similarity/grouping computed from real descriptors, not a fixed score
- [ ] `/api/v1/graph` returns different, correct results for at least two different test accounts (Use Case B)
- [ ] AI review context pulled from Neo4j per-merchant and shown to differ across merchants (Use Case C)
- [ ] No function, route, or fallback path returns fabricated graph data disguised as a real result

The implementing agent must not report this task as complete, finished, or done if any checkbox above is unchecked or unverified. Before declaring completion, the agent must state, for each use case, what was changed and how it was verified against the actual AuraDB instance (query run, output shown, or both). If something could not be fully connected in the available time, the agent must say so explicitly and name which checkbox remains open — it must never present a hardcoded stand-in as if it were the real integration.
