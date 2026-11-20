"""Robust raw text statement parser for bank statements.

Extracts line-by-line transaction records (Date, Description, Amount, Direction, Channel)
from unformatted text, OCR output, and text-based PDFs that lack explicit table grids.
"""
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from dateutil import parser as date_parser
from app.analytics.autodebit_keyword_service import AutoDebitKeywordService

logger = logging.getLogger(__name__)

# Matches various international & Indian bank date patterns:
# YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, Mon DD YYYY
DATE_REGEX = re.compile(
    r"(?P<date>\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|"
    r"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|"
    r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b|"
    r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b)",
    re.IGNORECASE,
)

# Matches monetary figures with optional comma separators and currency symbols (e.g. 649, 649.00, 1,200.50, ₹499)
AMOUNT_REGEX = re.compile(
    r"(?:₹|Rs\.?|INR|\$|€|£)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)"
)


class RawTextStatementParser:
    """Parses arbitrary raw text and OCR statement lines into structured rows."""

    HEADERS = ["Date", "Description", "Amount", "Currency", "Direction", "Channel"]

    @classmethod
    def parse(cls, text: str) -> Tuple[List[str], List[Dict[str, Any]]]:
        if not text or not text.strip():
            return [], []

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        rows: List[Dict[str, Any]] = []
        keyword_svc = AutoDebitKeywordService.get_instance()

        for line_idx, line in enumerate(lines):
            # Skip obvious header/footer metadata lines
            lower = line.lower()
            if any(h in lower for h in [
                "statement of account", "opening balance", "closing balance",
                "page number", "page 1 of", "account summary", "total debit",
                "total credit", "ifsc code", "micr code", "customer id"
            ]):
                continue

            date_match = DATE_REGEX.search(line)
            if not date_match:
                continue

            raw_date_str = date_match.group("date")
            try:
                parsed_dt = date_parser.parse(raw_date_str)
                iso_date = parsed_dt.strftime("%Y-%m-%d")
            except Exception:
                continue

            # Remove date from the line to parse amount & description
            rest_of_line = line[:date_match.start()] + " " + line[date_match.end():]
            rest_of_line = re.sub(r"\s+", " ", rest_of_line).strip()

            amounts = AMOUNT_REGEX.findall(rest_of_line)
            if not amounts:
                continue

            # Take the first amount as transaction amount
            raw_amount_str = amounts[0].replace(",", "")
            try:
                amount_val = float(raw_amount_str)
            except ValueError:
                continue

            if amount_val <= 0:
                continue

            # Determine direction (debit vs credit)
            direction = "debit"
            if re.search(r"\b(cr|credit|deposit|\+)\b", rest_of_line, re.IGNORECASE):
                direction = "credit"

            # Clean description by removing amount, currency, and balance markers
            desc = AMOUNT_REGEX.sub("", rest_of_line).strip()
            desc = re.sub(
                r"\b(INR|Rs\.?|debit|credit|dr|cr|bal|balance)\b",
                "",
                desc,
                flags=re.IGNORECASE,
            ).strip()
            desc = re.sub(r"\s+", " ", desc).strip()

            # Ensure minimum meaningful description
            if len(desc) < 2:
                desc = f"Transaction on {iso_date}"

            # Auto-detect payment channel using keyword intelligence
            analysis = keyword_svc.analyze_descriptor(desc)
            channel = analysis.payment_rail if analysis.is_autodebit_candidate else "General Debit"

            rows.append({
                "Date": iso_date,
                "Description": desc,
                "Amount": amount_val,
                "Currency": "INR",
                "Direction": direction,
                "Channel": channel,
                "_row_number": len(rows) + 1,
            })

        if not rows:
            return [], []

        logger.info(f"RawTextStatementParser extracted {len(rows)} structured statement row(s).")
        return cls.HEADERS, rows
