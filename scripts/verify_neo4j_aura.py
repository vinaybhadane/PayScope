"""Opt-in verification against the configured AuraDB, Gemini and the isolated test PostgreSQL database."""

import json
import logging
import os
from pathlib import Path
import secrets
import subprocess
import sys
from threading import Thread
from time import monotonic, sleep
from urllib.parse import urlsplit
import uuid

os.environ["RATE_LIMIT_STORAGE_URI"] = "memory://"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.graph.config import neo4j_settings
from app.graph.driver import close_neo4j_driver, get_neo4j_driver
from app.graph.review_context import payment_graph_context
from app.graph.schema import initialize_graph_schema
from app.main import create_application
from app.models.demo_user import DemoUser


def check_response(response, expected):
    assert response.status_code == expected, (response.request.url.path, response.status_code, response.text[:400])
    return response.json()


def verify_browser(application, workspaces):
    import uvicorn

    server = uvicorn.Server(uvicorn.Config(application, host="127.0.0.1", port=8812, lifespan="off", log_level="warning"))
    thread = Thread(target=server.run, daemon=True)
    thread.start()
    try:
        deadline = monotonic() + 10
        while not server.started and thread.is_alive() and monotonic() < deadline:
            sleep(0.05)
        assert server.started, "The isolated browser verification API could not start."
        subprocess.run(["node", str(Path(__file__).with_name("check-live-neo4j-browser.cjs"))],
                       input=json.dumps({"webOrigin": "http://127.0.0.1:3031", "workspaces": workspaces}),
                       text=True, check=True, timeout=120)
    finally:
        server.should_exit = True
        thread.join(timeout=10)


def verify():
    app_db = make_url(settings.DATABASE_URL)
    test_db = make_url(settings.TEST_DATABASE_URL)
    assert test_db.database == "mandatelens_test" and test_db != app_db, "A separate test PostgreSQL database is required."
    aura = urlsplit(neo4j_settings.URI)
    assert aura.scheme == "neo4j+s" and (aura.hostname or "").endswith(".databases.neo4j.io"), "A TLS AuraDB connection is required."
    assert neo4j_settings.ENABLED and neo4j_settings.USERNAME and neo4j_settings.PASSWORD and settings.GEMINI_API_KEY
    settings.RUN_MIGRATIONS = False
    settings.EMAIL_WORKER_ENABLED = False
    settings.ALLOW_GUEST_SESSIONS = True
    settings.API_SESSION_SECRET = secrets.token_urlsafe(48)
    neo4j_settings.REQUIRED = True
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger("neo4j.notifications").setLevel(logging.ERROR)
    logging.getLogger("app.analytics.ai_review").setLevel(logging.DEBUG)

    # Real startup verification with an ephemeral incorrect value. Do not print it or modify environment files.
    password = neo4j_settings.PASSWORD
    try:
        neo4j_settings.PASSWORD = secrets.token_urlsafe(32)
        try:
            with TestClient(create_application()):
                raise AssertionError("Required Neo4j incorrectly accepted credentials")
        except RuntimeError as exc:
            assert "Required Neo4j connection unavailable" in str(exc), str(exc)
        print("PASS: actual AuraDB rejected the incorrect credential and required startup failed.", flush=True)
    finally:
        neo4j_settings.PASSWORD = password
        close_neo4j_driver()

    engine = create_engine(test_db)
    if "--browser" in sys.argv:
        settings.BACKEND_CORS_ORIGINS = [*settings.BACKEND_CORS_ORIGINS, "http://127.0.0.1:3031"]
    application = create_application()

    def isolated_db():
        with Session(engine, expire_on_commit=False) as db:
            yield db

    application.dependency_overrides[get_db] = isolated_db
    temporary_workspaces = []
    try:
        with TestClient(application) as client:
            driver = get_neo4j_driver()
            driver.verify_connectivity()
            initialize_graph_schema(driver, neo4j_settings.DATABASE)
            with driver.session(database=neo4j_settings.DATABASE) as graph:
                before = graph.run("SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties RETURN name, labelsOrTypes, properties ORDER BY name").data()
            initialize_graph_schema(driver, neo4j_settings.DATABASE)
            with driver.session(database=neo4j_settings.DATABASE) as graph:
                after = graph.run("SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties RETURN name, labelsOrTypes, properties ORDER BY name").data()
            assert before == after
            for label, field in [("Account", "id"), ("Merchant", "id"), ("Mandate", "reference")]:
                assert sum(row["labelsOrTypes"] == [label] and row["properties"] == [field] for row in after) == 1
            print("PASS: two schema passes on AuraDB produced identical unique constraints for Account, Merchant and Mandate.", flush=True)

            def guest():
                issued = check_response(client.post("/api/v1/auth/guest"), 200)
                headers = {"Authorization": f"Bearer {issued['access_token']}"}
                identity = check_response(client.get("/api/v1/auth/me", headers=headers), 200)
                assert identity["is_demo"]
                temporary_workspaces.append((uuid.UUID(identity["id"]), f"guest:{issued['uid']}"))
                empty = check_response(client.get("/api/v1/graph", headers=headers), 200)
                assert empty["source"] == "neo4j" and not empty["nodes"] and not empty["edges"]
                return identity["id"], headers

            first, first_headers = guest()
            second, second_headers = guest()

            def upload(filename, text, headers, count):
                body = check_response(client.post("/api/v1/imports", headers=headers,
                    files={"file": (filename, "Date,Description,Debit,Credit,Mandate Reference\n" + text, "text/csv")}), 201)
                assert body["accepted_count"] == count, body
                assert body["workspace_refresh"]["graph_status"] == "completed", body["workspace_refresh"]

            upload("aura-qa-september.csv", "2025-09-05,NETFLIX.COM,649.00,,QA-SUB-11\n"
                   "2025-09-06,ORBIT CLOUD MONTHLY SUBSCRIPTION,99.50,,QA-SUB-22\n", first_headers, 2)
            upload("aura-qa-october.csv", "2025-10-05,NETFLIX ENTM,649.00,,QA-SUB-11\n"
                   "2025-10-06,ORBIT CLOUD MONTHLY SUBSCRIPTION,99.50,,QA-SUB-22\n"
                   "2025-11-06,ORBIT CLOUD MONTHLY SUBSCRIPTION,109.50,,QA-SUB-22\n", first_headers, 3)
            upload("aura-qa-other.csv", "2025-10-05,CEDARLINE BOOKS,37.25,,\n", second_headers, 1)

            with driver.session(database=neo4j_settings.DATABASE) as graph:
                pair = graph.run("""
                    MATCH (a:MerchantDescriptor {user_id:$owner})-[r:SIMILAR_DESCRIPTOR {user_id:$owner}]->(b:MerchantDescriptor {user_id:$owner})
                    WHERE a.rawDescriptor IN $descriptors AND b.rawDescriptor IN $descriptors
                    RETURN a.rawDescriptor AS first, b.rawDescriptor AS second, r.score AS score
                """, owner=first, descriptors=["NETFLIX.COM", "NETFLIX ENTM"]).single(strict=True)
                assert pair["first"] != pair["second"] and pair["score"] > 0
                print(f"PASS live Cypher descriptor link: {pair['first']} ↔ {pair['second']} (score {pair['score']:.2f}).", flush=True)
                mandates = graph.run("""
                    MATCH (:Account {ownerId:$owner})-[:PAYS {user_id:$owner}]->(:Merchant)
                          -[:HAS_MANDATE {user_id:$owner}]->(m:Mandate {user_id:$owner})
                    RETURN count(DISTINCT m) AS n
                """, owner=first).single()["n"]
                assert mandates == 2
                print(f"PASS live Cypher: {mandates} distinct observed mandates in the first workspace.", flush=True)

            def live(headers):
                result = check_response(client.get("/api/v1/graph", headers=headers), 200)
                ids = {node["data"]["id"] for node in result["nodes"]}
                assert result["source"] == "neo4j" and all(edge["data"]["source"] in ids and edge["data"]["target"] in ids for edge in result["edges"])
                return result, ids

            left, left_ids = live(first_headers)
            right, right_ids = live(second_headers)
            assert left_ids and right_ids and not left_ids & right_ids
            assert first in left_ids and second in right_ids
            assert client.get(f"/api/v1/graph?user_id={first}", headers=second_headers).status_code == 403
            for headers, snapshot in [(first_headers, left), (second_headers, right)]:
                summary = check_response(client.get("/api/v1/graph/summary", headers=headers), 200)
                assert summary["total_nodes"] == len(snapshot["nodes"])
                assert summary["total_relationships"] == len(snapshot["edges"])
            print(f"PASS live graph: {len(left_ids)} vs {len(right_ids)} nodes with isolated workspaces; cross-workspace GET rejected.", flush=True)

            debits = [n["data"]["id"] for n in left["nodes"] if n["data"]["node_type"] == "Transaction"]
            facts = payment_graph_context(uuid.UUID(first), debits)
            assert len({(fact["accountCount"], fact["transactionCount"], fact["mandateCount"],
                         tuple(fact["existingFlags"])) for fact in facts}) >= 2
            review = check_response(client.post("/api/v1/workspace/graph-review", headers=first_headers), 200)
            assert review["status"] == "completed" and review["merchants_reviewed"] >= 2 and review["highlights"]
            print(f"PASS live Gemini: {review['merchants_reviewed']} merchant context blocks and {len(review['highlights'])} cited highlights.", flush=True)
            if "--browser" in sys.argv:
                verify_browser(application, [
                    {"token": first_headers["Authorization"].split()[1], "uid": first,
                     "shown": "NETFLIX.COM", "absent": "CEDARLINE BOOKS"},
                    {"token": second_headers["Authorization"].split()[1], "uid": second,
                     "shown": "CEDARLINE BOOKS", "absent": "NETFLIX.COM"},
                ])
    finally:
        # Clean only workspaces whose test guest identities were generated above.
        if temporary_workspaces:
            try:
                driver = get_neo4j_driver()
                with driver.session(database=neo4j_settings.DATABASE) as graph:
                    for owner, _ in temporary_workspaces:
                        graph.run("MATCH (n {user_id:$owner}) DETACH DELETE n", owner=str(owner)).consume()
            finally:
                with Session(engine) as db:
                    for owner, key in temporary_workspaces:
                        db.execute(delete(DemoUser).where(DemoUser.id == owner, DemoUser.workspace_key == key))
                    db.commit()
                close_neo4j_driver()
        engine.dispose()


if __name__ == "__main__":
    if "--live" not in sys.argv:
        raise SystemExit("Pass --live to upload synthetic statements to isolated test workspaces and run real Neo4j and Gemini calls.")
    sys.stdout.reconfigure(encoding="utf-8")
    verify()
