"""Read-only comparison and batching probe against configured source records.

Neo4j writes are mocked here; this does not claim a live graph-server validation.
"""
from time import perf_counter
from unittest.mock import MagicMock, patch
from sqlalchemy import event
from fastapi import Response
from app.db.session import engine, SessionLocal
from app.repositories.user_repository import UserRepository
from app.api.v1.routes.dashboard import get_dashboard_summary
from app.analytics.financial_impact.impact_summary import get_user_financial_summary
from app.graph.sync_service import GraphSyncService

statements = []
event.listen(engine, "before_cursor_execute", lambda *args: statements.append(1))
with SessionLocal() as db:
    user = UserRepository.get_by_workspace_key(db, "demo_workspace_primary")
    assert user, "An existing workspace is required; this probe creates no data."
    statements.clear()
    response = Response()
    started = perf_counter()
    summary = get_dashboard_summary(response=response, user_id=user.id, db=db)
    cold_ms = round((perf_counter() - started) * 1000, 1)
    query_count = len(statements)
    assert summary.data_status == "ok"
    reference = get_user_financial_summary(db, user.id)
    assert summary.kpis.monthly_recurring_spend == reference.monthly_recurring_spend
    assert summary.kpis.annualized_recurring_spend == reference.annualized_recurring_spend
    assert summary.kpis.potential_annual_savings == reference.potential_annual_savings
    statements.clear()
    started = perf_counter()
    cached_response = Response()
    cached = get_dashboard_summary(response=cached_response, user_id=user.id, db=db)
    warm_ms = round((perf_counter() - started) * 1000, 2)
    assert not statements and cached_response.headers["x-cache"] == "HIT"
    assert cached == summary
    print({"uncached_ms": cold_ms, "sql_statements": query_count, "cached_ms": warm_ms, "cached_sql": 0, "financial_totals_match_reference": True})

    driver, session, tx = MagicMock(), MagicMock(), MagicMock()
    driver.session.return_value.__enter__.return_value = session
    session.execute_write.side_effect = lambda callback: callback(tx)
    with patch("app.graph.sync_service.get_neo4j_driver", return_value=driver), patch("app.graph.sync_service.initialize_graph_schema"):
        result = GraphSyncService(db).sync_user_graph(user.id)
    assert result.nodes_synced > 0 and result.relationships_synced > 0
    assert all(len(call.kwargs["rows"]) <= 500 for call in tx.run.call_args_list)
    print({"projected_nodes": result.nodes_synced, "projected_edges": result.relationships_synced, "write_batches": tx.run.call_count, "live_neo4j_writes": False})
