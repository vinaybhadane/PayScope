"""Validate OCR data before normalizers or AI can trust it as financial evidence."""
from datetime import date
from decimal import Decimal
import math
import re
import unicodedata
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.ai_security import clean_invisible, log_quarantine, text_risks
from app.ingestion.raw_text_parser import RawTextStatementParser

MIN_OCR_CONFIDENCE = 0.80


class OCRRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: str
    descriptor: str = Field(min_length=2, max_length=120)
    amount: Decimal = Field(gt=0, allow_inf_nan=False, max_digits=18, decimal_places=2)

    @field_validator("date")
    @classmethod
    def iso_date(cls, value):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("OCR date must be YYYY-MM-DD")
        date.fromisoformat(value)
        return value

    @field_validator("descriptor")
    @classmethod
    def allowed_descriptor(cls, value):
        if any(not (unicodedata.category(c)[0] in {"L", "N"} or c in " .,/&()'\"+_:@#*%-") for c in value):
            raise ValueError("Unsupported OCR descriptor characters")
        return value


def confidence_score(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        score = float(value)
        if not math.isfinite(score) or score < 0 or score > 100:
            return 0.0
        return score / 100 if score > 1 else score
    return None


def parse_ocr_result(result):
    lines = getattr(result, "lines", None)
    if lines:
        records = []
        for line_number, line in enumerate(lines, 1):
            score = confidence_score(getattr(line, "confidence", None))
            word_scores = [confidence_score(getattr(word, "confidence", None)) for word in (getattr(line, "words", None) or [])]
            available = [s for s in [score, *word_scores] if s is not None]
            parsed = parse_ocr_text(getattr(line, "text", ""), min(available) if available else confidence_score(getattr(result, "confidence", None)), line_offset=line_number - 1)
            for row in parsed:
                row["_row_number"] = len(records) + 1
                records.append(row)
        return RawTextStatementParser.HEADERS, records
    return RawTextStatementParser.HEADERS, parse_ocr_text(getattr(result, "text", ""), confidence_score(getattr(result, "confidence", None)))


def parse_ocr_text(text, confidence=None, line_offset=0):
    rows = []
    for line_number, raw_line in enumerate(text.splitlines(), line_offset + 1):
        if not raw_line.strip():
            continue
        line = clean_invisible(raw_line)
        reasons = text_risks(raw_line)
        _, parsed = RawTextStatementParser.parse(line)
        if not parsed and not reasons and not re.search(r"\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b", line):
            continue  # Headers and non-transaction metadata.
        if not parsed:
            parsed = [{"Date": "", "Description": line[:120], "Amount": ""}]
            reasons.append("invalid_ocr_record")
        for row in parsed:
            row_reasons = list(reasons) + text_risks(row["Description"], descriptor=True)
            try:
                OCRRecord(date=row["Date"], descriptor=row["Description"], amount=str(row["Amount"]))
            except ValueError:
                row_reasons.append("invalid_ocr_schema")
            if confidence is not None and confidence < MIN_OCR_CONFIDENCE:
                row_reasons.append("low_ocr_confidence")
            row["_ocr_security"] = {"reasons": sorted(set(row_reasons)), "confidence": confidence, "line": line_number}
            row["_row_number"] = len(rows) + 1
            if row_reasons:
                log_quarantine(raw_line, row["_ocr_security"]["reasons"], line=line_number, confidence=confidence)
            rows.append(row)
    return rows
