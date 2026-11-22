"""Exercise imported statement changes through the workspace APIs."""
import json
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.core.config import settings


HEADER = "Date,Description,Debit,Credit,Mandate Reference,Status\n"
EARLIER = HEADER + """2025-08-01,Salary, ,45000,,successful
2025-08-03,NETFLIX.COM MONTHLY SUBSCRIPTION,649,,,successful
2025-08-06,ORBIT CLOUD UPI AUTOPAY SUBSCRIPTION,247.35,,MAN-ABC,successful
2025-08-10,WORKSPACE MONTHLY AUTOPAY SUBSCRIPTION,120,,,successful
2025-09-01,Salary,,45000,,successful
2025-09-03,NETFLIX.COM MONTHLY SUBSCRIPTION,649,,,successful
2025-09-06,ORBIT CLOUD UPI AUTOPAY SUBSCRIPTION,247.35,,MAN-ABC,successful
2025-09-10,WORKSPACE MONTHLY AUTOPAY SUBSCRIPTION,120,,,successful
"""
LATER = HEADER + """2025-10-01,Salary,,45000,,successful
2025-10-03,NETFLIX.COM MONTHLY SUBSCRIPTION,799,,,successful
2025-10-06,UPI AUTOPAY MANDATE CANCELLED,0,,MAN-ABC,cancelled
2025-10-09,SPOTIFY PREMIUM SUBSCRIPTION,149,,,successful
2025-10-12,DESIGN DESK MONTHLY SUBSCRIPTION,399.50,,,successful
2025-10-15,Affiliate Payout,,300,,successful
2025-10-20,Grocery,70,,,successful
2025-10-21,Pending POS,500,,,pending
2025-11-01,Salary,,45000,,successful
2025-11-03,NETFLIX.COM MONTHLY SUBSCRIPTION,799,,,successful
2025-11-09,SPOTIFY PREMIUM SUBSCRIPTION,149,,,successful
2025-11-12,DESIGN DESK MONTHLY SUBSCRIPTION,399.50,,,successful
"""
COMPARISON = "/api/v1/insights/statement-comparison"


def upload(client, name, data):
    response = client.post("/api/v1/imports", files={"file": (name, data, "text/csv")})
    assert response.status_code == 201, response.text
    assert response.json()["workspace_refresh"]["analysis_status"] == "completed", response.text
    return response.json()["import_id"]


def test_two_uploads_feed_cash_flow_changes_closures_and_chart(client, monkeypatch):
    empty = client.get(COMPARISON).json()
    assert empty["previous"] is None and empty["current"] is None
    earlier = upload(client, "earlier-private-filename.csv", EARLIER)
    assert client.get(COMPARISON).json()["previous"] is None
    later = upload(client, "later-private-filename.csv", LATER)
    response = client.get(COMPARISON)
    assert response.status_code == 200, response.text
    comparison = response.json()
    assert (comparison["previous"]["id"], comparison["current"]["id"]) == (earlier, later)
    assert not comparison["overlapping_dates"]
    assert comparison["totals"] == [{
        "currency": "INR",
        "previous": {"inflow": "90000.00", "outflow": "2032.70", "net": "87967.30", "count": 8},
        "current": {"inflow": "90300.00", "outflow": "2765.00", "net": "87535.00", "count": 10},
        "delta": {"inflow": "300.00", "outflow": "732.30", "net": "-432.30", "count": 2},
    }]
    changes = comparison["changes"]
    increase, = [item for item in changes if item["kind"] == "price_increase"]
    assert (increase["previous_amount"], increase["current_amount"]) == ("649.00", "799.00")
    assert len([item for item in changes if item["kind"] == "new_subscription"]) == 2
    closed, = [item for item in changes if item["kind"] == "closed"]
    missed, = [item for item in changes if item["kind"] == "payment_not_seen"]
    assert closed["evidence"] == "explicit_statement"
    assert missed["evidence"] is None
    assert [flow["amount"] for flow in comparison["new_flows"] if flow["direction"] == "credit"] == ["300.00"]

    chart = client.get("/api/v1/dashboard/summary").json()["financial_overview"]["monthly_activity"]
    assert [point["gross_debit"] for point in chart[-2:]] == ["1417.50", "1347.50"]
    assert client.get(f"/api/v1/commitments/{closed['commitment_id']}").json()["status"] == "ended_user_recorded"
    savings = client.get("/api/v1/savings/summary").json()["opportunities"]
    assert closed["commitment_id"] not in {item["commitment_id"] for item in savings}
    selection = next(item["id"] for item in savings if item["commitment_id"] == increase["commitment_id"])
    estimate = client.post("/api/v1/savings/calculate", json={"selected_opportunity_ids": [selection, selection]}).json()
    assert Decimal(estimate["selected_monthly_savings"]) == 799 and estimate["selected_count"] == 1

    explain_url = f"{COMPARISON}/explain?previous_id={earlier}&current_id={later}"
    assert client.post(explain_url).status_code == 503  # No fake Gemini answer.
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "isolated-test-key")

    def provider(url, *, headers, json, timeout):
        assert headers["x-goog-api-key"] == "isolated-test-key"
        outbound = json["contents"][0]["parts"][0]["text"]
        assert "90300.00" in outbound
        assert not any(value in outbound for value in ("NETFLIX", "MAN-ABC", "filename", earlier, later))
        body = {"highlights": [{"fact_id": 0, "explanation": "More money came in during the later statement."},
                               {"fact_id": 99, "explanation": "An invented event should get filtered out."}]}
        return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json_dump(body)}]}}],
        })

    monkeypatch.setattr("app.analytics.gemini_statement_insights.requests.post", provider)
    explained = client.post(explain_url)
    assert explained.status_code == 200, explained.text
    assert explained.json()["provider"] == "Gemini"
    assert len(explained.json()["highlights"]) == 1
    assert client.get(COMPARISON, params={"previous_id": str(uuid4()), "current_id": later}).status_code == 404


json_dump = json.dumps


def test_overlapping_files_keep_membership_without_duplicating_ledger(client):
    repeated = "2025-09-05,Book Store,20.15,,,successful\n"
    first = upload(client, "first.csv", HEADER + "2025-09-01,Salary,,100,,successful\n" + repeated)
    second = upload(client, "second.csv", HEADER + repeated + "2025-09-10,Groceries,90.20,,,successful\n")
    comparison = client.get(COMPARISON, params={"previous_id": first, "current_id": second}).json()
    assert comparison["shared_payments"] == 1
    assert comparison["overlapping_dates"]
    assert comparison["current"]["unlinked_count"] == 0
    assert comparison["totals"][0]["current"]["outflow"] == "110.35"
    assert client.get("/api/v1/transactions").json()["total"] == 3
