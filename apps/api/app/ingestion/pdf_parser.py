"""Extract statement tables and fallback to raw text & OCR for unstructured or scanned PDFs."""
import asyncio
import io
import logging
import re
import math
from typing import Any, Dict, List, Tuple
import pdfplumber

from app.ingestion.column_mapper import ColumnMapper
from app.ingestion.raw_text_parser import RawTextStatementParser
from app.ingestion.ocr_security import parse_ocr_result

OCR_DPI = 200
MAX_RENDER_PIXELS = 15_000_000
MAX_DOCUMENT_RENDER_PIXELS = 60_000_000


def page_render_pixels(page):
    # pdfplumber exposes width/height in points; other renderers expose page.rect.
    rect = getattr(page, "rect", None)
    width = rect.width if rect is not None else page.width
    height = rect.height if rect is not None else page.height
    width, height = float(width), float(height)
    # Cropping must not hide an enormous backing page. Some renderers allocate
    # the full MediaBox before cropping, and UserUnit scales PDF point units.
    for name in ("mediabox", "cropbox", "bbox"):
        box = getattr(page, name, None)
        if isinstance(box, (tuple, list)) and len(box) == 4:
            width = max(width, abs(float(box[2]) - float(box[0])))
            height = max(height, abs(float(box[3]) - float(box[1])))
    page_object = getattr(page, "page_obj", None)
    attributes = getattr(page_object, "attrs", {})
    unit = float(attributes.get("UserUnit", 1)) if isinstance(attributes, dict) else 1
    if not math.isfinite(unit) or unit <= 0:
        raise ValueError("PDF page has invalid scale units.")
    width *= max(1, unit)
    height *= max(1, unit)
    if not math.isfinite(width) or not math.isfinite(height) or width <= 0 or height <= 0:
        raise ValueError("PDF page has invalid dimensions.")
    pixels = math.ceil(width * OCR_DPI / 72) * math.ceil(height * OCR_DPI / 72)
    if pixels > MAX_RENDER_PIXELS:
        raise ValueError("PDF page exceeds the 15,000,000 pixel rendering safety limit at 200 DPI.")
    return pixels

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
            for page in document.pages:
                page_render_pixels(page)

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
                if len(document.pages) > 15:
                    raise ValueError("Scanned PDFs must contain at most 15 pages; split the document before uploading.")
                total_pixels = 0
                ocr_rows = []
                for page_number, page in enumerate(document.pages, 1):
                    total_pixels += page_render_pixels(page)
                    if total_pixels > MAX_DOCUMENT_RENDER_PIXELS:
                        raise ValueError("Scanned PDF exceeds the total rendering pixel budget; split the document.")
                    if hasattr(page, "to_image"):
                        img_obj = page.to_image(resolution=OCR_DPI)
                        pil_img = getattr(img_obj, "original", None)
                        if pil_img:
                            ocr_op = winocr.recognize_pil(pil_img, lang="en")
                            if hasattr(ocr_op, "get"):
                                ocr_res = ocr_op.get()
                            elif asyncio.iscoroutine(ocr_op):
                                ocr_res = asyncio.run(ocr_op)
                            else:
                                ocr_res = ocr_op

                            try:
                                if ocr_res:
                                    _, page_rows = parse_ocr_result(ocr_res)
                                    for row in page_rows:
                                        row["_row_number"] = len(ocr_rows) + 1
                                        row["_ocr_security"]["page"] = page_number
                                        ocr_rows.append(row)
                            finally:
                                pil_img.close()

                if ocr_rows:
                    return RawTextStatementParser.HEADERS, ocr_rows
            except ValueError:
                raise
            except Exception as ocr_err:
                logger.warning(f"Native OCR fallback on PDF pages encountered: {ocr_err}")

        # If all strategies fail:
        raise ValueError(
            "No readable statement transactions found in this PDF. "
            "Please ensure the document contains clear transaction dates, descriptions, and debit amounts."
        )
