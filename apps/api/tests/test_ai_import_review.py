"""Statement analysis is local and amounts are sourced from uploaded evidence."""
from unittest.mock import patch
from app.models.commitment import Commitment
from app.models.workspace_intelligence import WorkspaceIntelligence


def upload(client):
    csv = ("Date,Description,Amount,Currency,Direction,External_ID\n"
           "2026-09-03,ORBIT STORAGE MONTHLY,247,INR,debit,orbit-1\n"
           "2026-10-03,ORBIT STORAGE MONTHLY,247,INR,debit,orbit-2\n")
    return client.post("/api/v1/imports", files={"file": ("statement.csv", csv, "text/csv")})


def test_provider_failure_does_not_prevent_statement_analysis(client, db_session):
    with patch("app.analytics.ai_review.call_gemini", side_effect=ValueError("Provider unavailable")) as provider:
        response = upload(client)
    assert response.status_code == 201
    assert response.json()["accepted_count"] == 2
    assert response.json()["workspace_refresh"]["analysis_status"] == "completed"
    provider.assert_not_called()
    assert db_session.query(WorkspaceIntelligence).one().model == "statement-rules-v2"


def test_import_publishes_observed_amounts_consistently(client, db_session):
    assert upload(client).status_code == 201
    commitment = db_session.query(Commitment).one()
    assert float(commitment.representative_amount) == 247
    assert commitment.detector_version == "statement-rules-v2"
    summary = client.get("/api/v1/dashboard/summary").json()
    spending = client.get("/api/v1/financial-impact/summary").json()
    assert float(summary["kpis"]["monthly_recurring_spend"]) == 247
    assert float(spending["monthly_recurring_spend"]) == 247
    assert summary["ai_audit_score"] is None
