"""Extract statement tables and fallback to raw text & OCR for unstructured or scanned PDFs."""
import asyncio
import io
import logging
import re
from typing import Any, Dict, List, Tuple
import pdfplumber

from app.ingestion.column_mapper import ColumnMapper
from app.ingestion.raw_text_parser import RawTextStatementParser

logger = logging.getLogger(__name__)


class PDFParser:
    @staticmethod
    def parse(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        if not content.startswith(b"%PDF-"):
            raise ValueError("This file is not a valid PDF.")

        headers: List[str] = []
        rows: List[Dict[str, Any]] = []

        with pdfplumber.open(io.BytesIO(content)) as document:
            if len(document.pages) > 100:
                raise ValueError("PDF statements must contain at most 100 pages.")

            # Strategy 1: Grid and text table extraction
            for page in document.pages:
                tables = page.extract_tables()
                if not tables:
                    tables = page.extract_tables({"vertical_strategy": "text", "horizontal_strategy": "text"})
                for table in tables:
                    for cells in table:
                        cleaned = [re.sub(r"\s+", " ", str(cell or "")).strip() for cell in cells]
                        if not any(cleaned):
                            continue
                        mapping = ColumnMapper.auto_detect(cleaned)
                        if not ColumnMapper.validate_mapping(mapping, cleaned):
                            if headers and cleaned != headers:
                                continue
                            headers = cleaned
                            continue
                        if not headers or len(cleaned) != len(headers):
                            continue
                        row = dict(zip(headers, cleaned))
                        row["_row_number"] = len(rows) + 1
                        rows.append(row)

            if headers and rows:
                return headers, rows

            # Strategy 2: Raw selectable text extraction and regex pattern parsing
            logger.info("PDF table extraction yielded 0 rows; falling back to RawTextStatementParser.")
            raw_text_parts: List[str] = []
            for page in document.pages:
                try:
                    txt = page.extract_text()
                    if isinstance(txt, str) and txt.strip():
                        raw_text_parts.append(txt)
                except Exception:
                    pass

            combined_raw_text = "\n".join(raw_text_parts)
            if len(combined_raw_text.strip()) > 20:
                h, r = RawTextStatementParser.parse(combined_raw_text)
                if r:
                    return h, r

            # Strategy 3: Scanned / Image-only PDF fallback using OCR
            logger.info("Selectable text empty or unparseable; attempting OCR on rendered PDF pages.")
            try:
                import winocr
                ocr_text_parts: List[str] = []
                for page in document.pages[:15]:  # Limit first 15 pages for OCR responsiveness
                    if hasattr(page, "to_image"):
                        img_obj = page.to_image(resolution=200)
                        pil_img = getattr(img_obj, "original", None)
                        if pil_img:
                            ocr_op = winocr.recognize_pil(pil_img, lang="en")
                            if hasattr(ocr_op, "get"):
                                ocr_res = ocr_op.get()
                            elif asyncio.iscoroutine(ocr_op):
                                ocr_res = asyncio.run(ocr_op)
                            else:
                                ocr_res = ocr_op

                            if ocr_res and hasattr(ocr_res, "lines") and ocr_res.lines:
                                txt_lines = "\n".join(
                                    l.text for l in ocr_res.lines if hasattr(l, "text") and l.text.strip()
                                )
                                if txt_lines.strip():
                                    ocr_text_parts.append(txt_lines)
                            elif ocr_res and hasattr(ocr_res, "text") and isinstance(ocr_res.text, str):
                                ocr_text_parts.append(ocr_res.text)

                combined_ocr_text = "\n".join(ocr_text_parts)
                if combined_ocr_text.strip():
                    h, r = RawTextStatementParser.parse(combined_ocr_text)
                    if r:
                        return h, r
            except Exception as ocr_err:
                logger.warning(f"Native OCR fallback on PDF pages encountered: {ocr_err}")

        # If all strategies fail:
        raise ValueError(
            "No readable statement transactions found in this PDF. "
            "Please ensure the document contains clear transaction dates, descriptions, and debit amounts."
        )
