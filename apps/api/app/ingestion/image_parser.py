"""Image statement parser with OCR support for statement screenshots, scans, and photos."""
import asyncio
import io
import logging
from typing import Any, Dict, List, Tuple
from PIL import Image
from app.ingestion.raw_text_parser import RawTextStatementParser

logger = logging.getLogger(__name__)


class ImageStatementParser:
    """Parses image statements (PNG, JPG, JPEG, WEBP) using native OCR and raw text extraction."""

    @classmethod
    def parse(cls, content: bytes, filename: str = "image.png") -> Tuple[List[str], List[Dict[str, Any]]]:
        try:
            pil_image = Image.open(io.BytesIO(content))
            # Convert RGBA/P to RGB
            if pil_image.mode in ("RGBA", "P"):
                pil_image = pil_image.convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid image file '{filename}': {str(e)}")

        extracted_text = ""
        try:
            import winocr
            ocr_op = winocr.recognize_pil(pil_image, lang="en")
            if hasattr(ocr_op, "get"):
                ocr_result = ocr_op.get()
            elif asyncio.iscoroutine(ocr_op):
                ocr_result = asyncio.run(ocr_op)
            else:
                ocr_result = ocr_op

            if ocr_result and hasattr(ocr_result, "lines") and ocr_result.lines:
                extracted_text = "\n".join(
                    l.text for l in ocr_result.lines if hasattr(l, "text") and l.text.strip()
                )
            elif ocr_result and hasattr(ocr_result, "text") and ocr_result.text:
                extracted_text = ocr_result.text
        except Exception as ocr_err:
            logger.warning(f"Native Windows OCR error for '{filename}': {ocr_err}")

        if not extracted_text.strip():
            raise ValueError(
                f"No readable text could be recognized in the image '{filename}'. "
                "Please upload a clearer screenshot, PDF, or CSV export."
            )

        headers, rows = RawTextStatementParser.parse(extracted_text)
        if not rows:
            raise ValueError(
                f"Image '{filename}' was scanned, but no transaction lines with dates and amounts were found. "
                "Ensure the image clearly shows transaction dates, descriptions, and debit amounts."
            )

        return headers, rows
