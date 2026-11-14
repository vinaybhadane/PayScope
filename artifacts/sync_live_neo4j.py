"""Sync the existing configured workspace, then validate a real Neo4j read."""
from neo4j import Query, READ_ACCESS
from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.graph.sync_service import GraphSyncService
from app.graph.driver import get_neo4j_driver
from app.graph.config import neo4j_settings
from app.graph.overview_service import OVERVIEW_QUERY, serialize_neo4j

with SessionLocal() as db:
    user = UserRepository.get_by_workspace_key(db, "demo_workspace_primary")
    assert user, "Existing workspace not found. No source data was created."
    result = GraphSyncService(db).sync_user_graph(user.id)
    print(result.model_dump_json(), flush=True)
    driver = get_neo4j_driver()
    with driver.session(database=neo4j_settings.DATABASE, default_access_mode=READ_ACCESS) as session:
        record = session.run(Query(OVERVIEW_QUERY, timeout=10), user_id=str(user.id), limit=50).single()
        assert record, "No projected workspace was returned."
        graph = serialize_neo4j(record, 50)
    ids = {node.data.id for node in graph.nodes}
    assert graph.source == "neo4j" and graph.edges
    assert all(e.data.source in ids and e.data.target in ids for e in graph.edges)
    print({"source": graph.source, "visible_nodes": len(graph.nodes), "visible_edges": len(graph.edges), "all_endpoints_valid": True}, flush=True)
driver.close()
