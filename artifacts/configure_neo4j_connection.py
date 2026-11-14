"""Verify supplied credentials and persist them only to ignored environment files.

Connection settings arrive via stdin and are never printed.
"""
import json
from pathlib import Path
import re
import sys
import getpass
from neo4j import GraphDatabase, Query, TrustCustomCAs
import certifi
from neo4j.exceptions import AuthError, Neo4jError

print("Waiting for connection settings on stdin (not logged).", flush=True)
settings = json.loads(getpass.getpass("Connection settings (hidden): ") if sys.stdin.isatty() else sys.stdin.readline())
uri, supplied_user, password = settings["uri"], settings["username"], settings["password"]
database = settings["database"]
if any("\n" in value or "\r" in value for value in (uri, supplied_user, password, database)):
    raise ValueError("Connection values must be single-line strings.")
instance_id = uri.split("://", 1)[1].split(".", 1)[0]
users = [supplied_user]
if supplied_user == instance_id and supplied_user != "neo4j":
    users.append("neo4j")
accepted = None
def diagnostics(error, seen=None):
    seen = seen or set()
    if id(error) in seen: return None
    seen.add(id(error))
    return {"type": type(error).__name__, "message": str(error).replace(password, "[redacted]")[:350],
        "code": getattr(error, "code", None),
        "children": [diagnostics(child, seen) for child in getattr(error, "exceptions", ())],
        "cause": diagnostics(error.__cause__, seen) if error.__cause__ else None}
for user in users:
    driver = GraphDatabase.driver(uri.replace("+s://", "://", 1), auth=(user, password), encrypted=True,
        trusted_certificates=TrustCustomCAs(certifi.where()), connection_timeout=5,
        connection_acquisition_timeout=6, max_transaction_retry_time=0, max_connection_pool_size=3)
    try:
        driver.verify_connectivity()
        accepted = user
        break
    except AuthError:
        driver.close()
        continue
    except Exception as exc:
        driver.close()
        print(json.dumps({"attempt_username": user, "diagnostics": diagnostics(exc)}), flush=True)
        continue
if accepted is None:
    print(json.dumps({"connected": False, "error": "The supplied password was not accepted for the supplied username or the standard database account."}), flush=True)
    sys.exit(3)
try:
    with driver.session(database=database) as session:
        session.run(Query("RETURN 1 AS ok", timeout=6)).consume()
except Neo4jError as exc:
    if exc.code != "Neo.ClientError.Database.DatabaseNotFound":
        driver.close()
        print(json.dumps({"connected": True, "database_ready": False, "error_code": exc.code}), flush=True)
        sys.exit(4)
    with driver.session(database="system") as session:
        records = list(session.run(Query("SHOW DATABASES YIELD name, `default`, home RETURN name, `default`, home", timeout=6)))
    candidates = [r["name"] for r in records if r["name"] != "system" and (r.get("default") or r.get("home"))]
    if len(set(candidates)) != 1:
        print(json.dumps({"connected": True, "database_ready": False, "available_databases": [r["name"] for r in records if r["name"] != "system"]}), flush=True)
        sys.exit(5)
    database = candidates[0]
    with driver.session(database=database) as session:
        session.run(Query("RETURN 1 AS ok", timeout=6)).consume()
driver.close()
values = {"NEO4J_ENABLED": "true", "NEO4J_URI": uri, "NEO4J_USERNAME": accepted,
          "NEO4J_PASSWORD": password, "NEO4J_DATABASE": database}
root = Path(__file__).resolve().parents[1]
for relative in (".env", "apps/api/.env"):
    path = root / relative
    source = path.read_text(encoding="utf-8")
    for key, value in values.items():
        line = key + "=" + value
        pattern = rf"(?m)^{re.escape(key)}=.*$"
        source = re.sub(pattern, lambda _: line, source) if re.search(pattern, source) else source.rstrip() + "\n" + line + "\n"
    path.write_text(source, encoding="utf-8")
print(json.dumps({"connected": True, "database_ready": True, "username": accepted, "database": database, "environment_updated": True}), flush=True)
