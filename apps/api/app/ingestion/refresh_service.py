"""Rebuild workspace intelligence from committed imports, then project it to Neo4j."""
import logging
import uuid
from sqlalchemy.orm import Session
from app.analytics.commitment_detector import CommitmentDetector
from app.analytics.insights.insight_orchestrator import run_insight_detection
from app.core.read_cache import invalidate_read_caches
from app.graph.config import neo4j_settings
from app.graph.overview_service import reset_neo4j_circuit
from app.graph.sync_service import GraphSyncService

logger = logging.getLogger(__name__)


def refresh_imported_workspace(db: Session, user_id: uuid.UUID) -> dict:
    # Imports are already committed. A downstream failure must never undo them or
    # misreport the upload as failed; retrying this projection is idempotent.
    result = {"analysis_status": "failed", "graph_status": "not_started"}
    try:
        discovery = CommitmentDetector(db).discover_user_commitments(user_id)
        run_insight_detection(db, user_id)
        db.commit()
        result.update(analysis_status="completed", commitments_discovered=discovery.total_discovered)
    except Exception:
        db.rollback()
        logger.exception("Post-import analysis failed for workspace %s", user_id)
        result["message"] = "Your file is saved. Analysis needs a retry before the dashboard is current."
        invalidate_read_caches()
        return result
    if not neo4j_settings.ENABLED:
        result.update(graph_status="disabled", message="Dashboard updated. Neo4j is disabled; relationships use database records.")
    else:
        try:
            sync = GraphSyncService(db).sync_user_graph(user_id)
            reset_neo4j_circuit()
            result.update(graph_status="completed", nodes_synced=sync.nodes_synced,
                          relationships_synced=sync.relationships_synced,
                          message="Dashboard and Neo4j relationships updated from your imported records.")
        except Exception:
            db.rollback()
            logger.exception("Post-import Neo4j sync failed for workspace %s", user_id)
            result.update(graph_status="failed", message="Dashboard updated. Neo4j sync needs a retry; your file is saved.")
    invalidate_read_caches()
    return result
