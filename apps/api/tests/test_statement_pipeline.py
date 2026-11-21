"""Regressions for statement extraction, precise ledger totals and live analysis."""
import io
import time
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch
import openpyxl
import pytest
from reportlab.pdfgen.canvas import Canvas
from app.ingestion.column_mapper import ColumnMapper
from app.ingestion.import_service import ImportService
from app.ingestion.ocr_security import parse_ocr_text
from app.ingestion.schema_normalizer import SchemaNormalizer
from app.ingestion.raw_text_parser import RawTextStatementParser
from app.analytics.ai_review import _generate_heuristic_review
from app.analytics.financial_impact.upcoming import get_user_upcoming_expenditure


def normalize(filename, content, **overrides):
    _, headers, rows = ImportService._parse_content(filename, content)
    return SchemaNormalizer.normalize_transactions(rows, {**ColumnMapper.auto_detect(headers), **overrides})


def test_split_debit_credit_preamble_and_indian_dates():
    data = b'Account statement\nDate,Narration,Withdrawal (INR),Deposit (INR),Balance\n03/10/2026,Cloud subscription,247.35,,1000\n04/10/2026,Salary,,50000,51000\n'
    result = normalize("bank.csv", data)
    assert not result.errors
    assert [(row["amount"], row["direction"]) for row in result.valid_records] == [(Decimal("247.35"), "debit"), (Decimal("50000"), "credit")]
    assert result.valid_records[0]["transaction_date"].date() == date(2026, 10, 3)


def test_signed_amounts_direction_aliases_and_date_override():
    data = b'Date,Description,Amount\n03/10/2026,Cloud,-247.35\n04/10/2026,Salary,+50000\n'
    result = normalize("bank.csv", data, _date_order="monthfirst", _amount_convention="negative_debit")
    assert [row["direction"] for row in result.valid_records] == ["debit", "credit"]
    assert result.valid_records[0]["transaction_date"].date() == date(2026, 3, 10)
    alias = normalize("bank.csv", b'Date,Description,Amount,Dr/Cr\n2026-10-03,Refund,500,CR\n')
    assert alias.valid_records[0]["direction"] == "credit"


def test_bad_direction_and_conflicting_columns_require_review():
    result = normalize("bank.csv", b'Date,Description,Debit,Credit,Direction\n2026-10-03,Cloud,247,500,debit\n2026-10-04,Shop,200,,banana\n')
    assert not result.valid_records
    assert {error.row for error in result.errors} == {2, 3}


def test_semicolon_and_utf16_bank_export():
    data = 'Statement\nDate;Description;Debit;Credit\n2026-10-03;Cloud;247.35;\n'
    result = normalize("bank.csv", data.encode("utf-16"))
    assert result.valid_records[0]["amount"] == Decimal("247.35")


def test_all_excel_sheets_preserve_blank_column_positions():
    workbook = openpyxl.Workbook()
    first = workbook.active
    first.append(["Bank statement"])
    first.append(["Date", None, "Description", "Debit", "Credit"])
    first.append([datetime(2026, 10, 3), None, "Cloud monthly", 247.35, None])
    second = workbook.create_sheet("Other account")
    second.append(["Txn Date", "Narration", "Amount", "Dr/Cr"])
    second.append([datetime(2026, 10, 4), "Salary", 50000, "CR"])
    stream = io.BytesIO()
    workbook.save(stream)
    result = normalize("bank.xlsx", stream.getvalue())
    assert not result.errors
    assert [(row["amount"], row["direction"]) for row in result.valid_records] == [(Decimal("247.35"), "debit"), (Decimal("50000"), "credit")]
    assert result.valid_records[1]["raw_source_snapshot"]["_sheet"] == "Other account"


def test_fingerprints_survive_reordered_overlapping_files():
    header = b'Date,Description,Amount\n'
    first = b'2026-10-03,Cloud,247.35\n'
    second = b'2026-10-04,Shop,120.15\n'
    left = normalize("a.csv", header + first + second)
    right = normalize("b.csv", header + second + first)
    assert {row["external_synthetic_id"] for row in left.valid_records} == {row["external_synthetic_id"] for row in right.valid_records}
    repeated = normalize("c.csv", header + first + first)
    assert len({row["external_synthetic_id"] for row in repeated.valid_records}) == 2


def test_text_amount_never_uses_utr_and_preserves_narration_numbers():
    headers, rows = RawTextStatementParser.parse("2026-10-03 UPI/987654321012/SHOP 24 MEMBERSHIP 247.35 DR")
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(headers))
    assert result.valid_records[0]["amount"] == Decimal("247.35")
    assert "987654321012" in result.valid_records[0]["raw_descriptor"]
    assert "24" in result.valid_records[0]["raw_descriptor"]


def test_ambiguous_text_is_reported_instead_of_guessed():
    headers, rows = RawTextStatementParser.parse("2026-10-03 SHOP 247.35 55000.00")
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(headers))
    assert rows and len(result.errors) == 1 and not result.valid_records


def test_unruled_pdf_with_dash_placeholders_imports_all_reported_rows(client):
    lines = [
        "Date Description Category Debit Credit Balance",
        "02 Oct 2026 NETFLIX.COM - Monthly Plan SUBSCRIPTION 649.00 - 11,851.00",
        "04 Oct 2026 AMAZON PRIME - Membership SUBSCRIPTION 299.00 - 11,552.00",
        "06 Oct 2026 OPENAI CHATGPT PLUS - Monthly SUBSCRIPTION 1,999.00 - 9,553.00",
        "08 Oct 2026 JIOHOTSTAR - Monthly Plan SUBSCRIPTION 299.00 - 9,254.00",
        "10 Oct 2026 YOUTUBE PREMIUM - Monthly SUBSCRIPTION 149.00 - 9,105.00",
        "12 Oct 2026 SPOTIFY PREMIUM - Monthly SUBSCRIPTION 119.00 - 8,986.00",
        "15 Oct 2026 SALARY CREDIT - DEMO EMPLOYER INCOME - 45,000.00 53,986.00",
        "18 Oct 2026 GROCERY MART - UPI SHOPPING 2,450.00 - 51,536.00",
        "22 Oct 2026 ELECTRICITY BILL - UPI UTILITIES 1,850.00 - 49,686.00",
        "27 Oct 2026 FUEL STATION - CARD TRANSPORT 1,200.00 - 48,486.00",
    ]
    pdf = io.BytesIO()
    canvas = Canvas(pdf)
    for index, line in enumerate(lines):
        if index == 7:
            canvas.showPage()
        canvas.drawString(24, 800 - (index % 7) * 24, line)
    canvas.save()

    result = normalize("statement.pdf", pdf.getvalue())

    assert not result.errors
    assert [r["amount"] for r in result.valid_records] == list(map(Decimal, [
        "649.00", "299.00", "1999.00", "299.00", "149.00", "119.00", "45000.00", "2450.00", "1850.00", "1200.00",
    ]))
    assert [r["direction"] for r in result.valid_records] == ["debit"] * 6 + ["credit"] + ["debit"] * 3
    assert result.valid_records[6]["raw_descriptor"] == "SALARY CREDIT - DEMO EMPLOYER INCOME"
    assert result.valid_records[6]["raw_source_snapshot"]["Balance"] == "53,986.00"
    assert result.valid_records[6]["raw_source_snapshot"]["_page"] == 2

    files = {"file": ("statement.pdf", pdf.getvalue(), "application/pdf")}
    for route, count_key in (("/api/v1/imports/preview", "valid_count"), ("/api/v1/imports", "accepted_count")):
        response = client.post(route, files=files)
        assert response.status_code == 202, response.text
        job_url = f"/api/v1/imports/jobs/{response.json()['job_id']}"
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            job_response = client.get(job_url)
            assert job_response.status_code == 200, job_response.text
            job = job_response.json()
            if job["status"] in ("completed", "failed"):
                break
            time.sleep(0.1)
        assert job["status"] == "completed", job
        assert job["result"][count_key] == 10
        assert not job["result"]["errors"]

    totals = client.get("/api/v1/transactions").json()["totals"]
    assert len(totals) == 1 and totals[0]["currency"] == "INR"
    assert Decimal(totals[0]["debits"]) == Decimal("9014.00")
    assert Decimal(totals[0]["credits"]) == Decimal("45000.00")


def test_ocr_dashes_and_reordered_deposit_withdrawal_columns():
    text = (
        "Date Narration Deposit Withdrawal Balance\n"
        "02-Oct-2026 Hours invoice 45,000.00 \u2014 53,986.00\n"
        "04-Oct-2026 Membership \u2013 247.35 53,738.65\n"
        "06-Oct-2026 Fuel 0.00 15.50 53,723.15"
    )
    rows = parse_ocr_text(text, confidence=0.95)
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(RawTextStatementParser.HEADERS))
    assert not result.errors
    assert [(r["direction"], r["amount"]) for r in result.valid_records] == [
        ("credit", Decimal("45000.00")), ("debit", Decimal("247.35")), ("debit", Decimal("15.50")),
    ]


def test_split_text_requires_clear_direction_even_for_salary():
    headers, rows = RawTextStatementParser.parse(
        "Date Description Debit Credit Balance\n"
        "02 Oct 2026 Salary 45,000.00 53,986.00\n"
        "04 Oct 2026 Transfer 100.00 200.00 54,086.00"
    )
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(headers))
    assert not result.valid_records
    assert [e.row for e in result.errors] == [2, 3]
    assert "which amount is a debit or credit" in result.errors[0].reason
    assert "one non-zero amount" in result.errors[1].reason


def test_split_text_without_header_never_imports_balance_as_a_debit():
    headers, rows = RawTextStatementParser.parse("02 Oct 2026 Membership 247.35 - 10,000.00")
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(headers))
    assert not result.valid_records
    assert "Include the column header" in result.errors[0].reason


def test_one_decimal_ocr_amount_is_preserved():
    headers, rows = RawTextStatementParser.parse("2026-10-03 CLOUD MONTHLY 2499.0")
    result = SchemaNormalizer.normalize_transactions(rows, ColumnMapper.auto_detect(headers))
    assert result.valid_records[0]["amount"] == Decimal("2499.00")


def test_standing_instruction_is_legitimate_bank_narration():
    result = normalize("bank.csv", b'Date,Description,Amount\n2026-10-03,STANDING INSTRUCTION CLOUD MONTHLY,247.35\n')
    assert len(result.valid_records) == 1 and not result.quarantined_records


def test_rupee_prefix_and_incomplete_dates():
    result = normalize("bank.csv", b'Date,Description,Amount\n2026-10-03,Cloud,Rs.100\n2026,Missing date,100\n')
    assert result.valid_records[0]["amount"] == Decimal("100.00")
    assert len(result.valid_records) == 1
    assert "complete transaction date" in result.errors[0].reason


def test_one_matching_interval_cannot_confirm_unrelated_purchases():
    import uuid
    records = [{"id": str(uuid.uuid4()), "date": value, "description": "UPI SHOP", "amount": "100", "currency": "INR"}
               for value in ["2026-01-01T00:00:00", "2026-02-01T00:00:00", "2026-08-01T00:00:00"]]
    assert not _generate_heuristic_review(records).subscriptions


def test_single_autopay_is_an_unpriced_candidate():
    import uuid
    result = _generate_heuristic_review([{"id": str(uuid.uuid4()), "date": "2026-10-03T00:00:00",
        "description": "CLOUD SUBSCRIPTION AUTOPAY", "amount": "247.35", "currency": "INR"}])
    assert len(result.subscriptions) == 1
    assert result.subscriptions[0].confidence == "low"
    assert result.subscriptions[0].cadence == "unknown"


def test_upcoming_includes_every_observed_weekly_occurrence():
    import uuid
    item = SimpleNamespace(is_confirmed=True, representative_amount=Decimal("10"), next_expected_date=date(2026, 10, 5),
        cadence="weekly", commitment_id=uuid.uuid4(), display_name="Cloud", merchant_name="Cloud", currency="INR")
    result = get_user_upcoming_expenditure(None, None, as_of=date(2026, 11, 1), cost_items=[item])
    assert result.total_upcoming_30d == Decimal("50.00")
    assert result.items[0].expected_date == date(2026, 11, 2)
    assert all(item.estimation_basis == "estimated_from_observed_cadence" for item in result.items)


def test_real_upload_populates_ledger_and_tabs_consistently(client, db_session):
    from app.models.transaction import Transaction
    from app.models.commitment import Commitment
    data = ('Date,Narration,Debit,Credit,Currency,Reference,Status\n'
        '03/08/2026,ORBIT MONTHLY,247.35,,INR,a1,successful\n'
        '03/09/2026,ORBIT MONTHLY,247.35,,INR,a2,successful\n'
        '03/10/2026,ORBIT MONTHLY,299.35,,INR,a3,successful\n'
        '04/10/2026,SALARY,,50000,INR,s1,successful\n'
        '05/10/2026,FOOD,125.50,,INR,f1,successful\n'
        '06/10/2026,FOREIGN PAYMENT,12.50,,USD,u1,successful\n'
        '07/10/2026,PENDING,400,,INR,p1,pending\n'
        '08/10/2026,BAD AMOUNT,nope,,INR,b1,successful\n')
    response = client.post('/api/v1/imports', files={'file': ('statement.csv', data, 'text/csv')})
    assert response.status_code == 201
    assert response.json()['accepted_count'] == 7
    assert response.json()['rejected_count'] == 1
    assert response.json()['workspace_refresh']['analysis_status'] == 'completed'
    ledger = client.get('/api/v1/transactions').json()
    assert ledger['total'] == 7
    totals = {row['currency']: row for row in ledger['totals']}
    assert Decimal(totals['INR']['debits']) == Decimal('919.55')
    assert Decimal(totals['INR']['credits']) == Decimal('50000')
    assert totals['INR']['excluded_count'] == 1
    assert Decimal(totals['USD']['debits']) == Decimal('12.50')
    assert all(not tx.is_synthetic for tx in db_session.query(Transaction).all())
    summary = client.get('/api/v1/dashboard/summary').json()
    spending = client.get('/api/v1/financial-impact/summary').json()
    assert Decimal(summary['kpis']['monthly_recurring_spend']) == Decimal('299.35')
    assert Decimal(spending['monthly_recurring_spend']) == Decimal('299.35')
    assert len(client.get('/api/v1/commitments').json()) == 1
    assert len(db_session.query(Commitment).one().detection_reason_codes) > 0
    assert client.get('/api/v1/insights').status_code == 200
    assert client.get('/api/v1/savings/summary').status_code == 200
    assert client.get('/api/v1/cancellations').json() == []
    assert client.get('/api/v1/graph/explorer').status_code == 200
    duplicate = client.post('/api/v1/imports', files={'file': ('renamed.csv', data, 'text/csv')})
    assert duplicate.json()['accepted_count'] == 0
    assert duplicate.json()['duplicate_count'] == 7
    assert client.get('/api/v1/transactions').json()['total'] == 7


def test_preview_counts_invalid_rows_once_and_in_file_duplicates(client):
    content = 'Date,Description,Amount,External_ID\n2026-10-03,Cloud,100,same\n2026-10-04,Cloud,100,same\ninvalid,,nope,bad\n'
    response = client.post('/api/v1/imports/preview', files={'file': ('bank.csv', content, 'text/csv')})
    assert response.status_code == 200
    body = response.json()
    assert (body['total_rows'], body['valid_count'], body['duplicate_count'], body['invalid_count']) == (3, 1, 1, 1)
    assert body['preview_rows'][1]['is_duplicate']


def test_unrecognized_headers_can_be_mapped_before_import(client):
    content = 'When,Who,Value\n2026-10-03,Cloud,247.35\n'
    files = {'file': ('statement.csv', content, 'text/csv')}
    response = client.post('/api/v1/imports/preview', files=files)
    assert response.status_code == 200
    assert not response.json()['success']
    assert response.json()['headers'] == ['When', 'Who', 'Value']
    import json
    mapped = client.post('/api/v1/imports/preview', files=files, data={'column_overrides': json.dumps({
        'transaction_date': 'When', 'raw_descriptor': 'Who', 'amount': 'Value'})})
    assert mapped.json()['success'] and mapped.json()['valid_count'] == 1
