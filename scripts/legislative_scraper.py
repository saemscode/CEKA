import os
import sys
import time
import json
import logging
import re
import io
import threading
import base64
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urljoin, unquote
from pathlib import Path

# ---------------------------------------------------------------------------
# B2 Vault Integration
# ---------------------------------------------------------------------------
try:
    from backblaze_utils import BackblazeVault
    B2_OK = True
except ImportError:
    B2_OK = False
    logging.getLogger(__name__).warning("backblaze_utils not importable – B2 upload disabled.")

# ---------------------------------------------------------------------------
# Stage Detector Integration
# ---------------------------------------------------------------------------
try:
    from stage_detector import detect_stage_from_text, extract_date_from_order_paper
    STAGE_DETECTOR_OK = True
except ImportError:
    STAGE_DETECTOR_OK = False
    logging.getLogger(__name__).warning("stage_detector not importable – stage detection disabled.")

# ---------------------------------------------------------------------------
# Multi-LLM & local OCR Integration
# ---------------------------------------------------------------------------
try:
    from multi_llm_orchestrator import MultiLLMOrchestrator
    ORCHESTRATOR_OK = True
except ImportError:
    ORCHESTRATOR_OK = False
    logging.getLogger(__name__).warning("multi_llm_orchestrator not found – high fidelity distillation disabled.")

try:
    import pytesseract
    from PIL import Image
    TESSERACT_OK = True
except ImportError:
    TESSERACT_OK = False
    logging.getLogger(__name__).warning("pytesseract or PIL not installed – local OCR fallback disabled.")

# ---------------------------------------------------------------------------
# Logging setup (UTF-8 safe for Windows)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("legislative_scrape.log", encoding='utf-8'),
        logging.StreamHandler(
            io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        )
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Dependency detection
# ---------------------------------------------------------------------------
try:
    import requests
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False
    logger.warning("requests not installed – PDF download disabled.")

try:
    import fitz  # PyMuPDF
    FITZ_OK = True
except ImportError:
    FITZ_OK = False
    logger.warning("PyMuPDF (fitz) not installed – PDF text extraction limited.")

try:
    from PyPDF2 import PdfReader
    PYPDF2_OK = True
except ImportError:
    PYPDF2_OK = False

try:
    import pdfplumber
    PDFPLUMBER_OK = True
except ImportError:
    PDFPLUMBER_OK = False

# ---------------------------------------------------------------------------
# Load environment variables from .env if python-dotenv is available
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
        logger.info(f"Loaded environment from {env_path}")
except ImportError:
    logger.info("python-dotenv not installed – reading environment variables directly.")


# ===================================================================
#  RemoteOCREngine  –  Resilient OCR.space + Cloudmersive Fallback
# ===================================================================
class RemoteOCREngine:
    """
    Production-grade remote OCR engine with cascading provider fallback.

    Provider chain:
      1. OCR.space  (Engine 2 → Engine 1 swap on low quality)
      2. Cloudmersive  (secondary fallback when OCR.space quota/rate limited)

    Free-tier guardrails:
      - OCR.space: 500 requests/day per IP, max 2 concurrent requests.
      - File size: ≤5 MB per request (client-side enforcement).
      - PDF page limit: 3 pages on free tier for searchable PDF.
    """

    OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image"
    CLOUDMERSIVE_ENDPOINT = "https://api.cloudmersive.com/ocr/pdf/toText"
    CLOUDMERSIVE_IMAGE_ENDPOINT = "https://testapi.cloudmersive.com/ocr/image/toText"

    # Quality thresholds
    MIN_TEXT_LENGTH = 200
    QUALITY_TOKENS = ["MEMORANDUM", "Bill", "An Act", "ENACTED", "PART I", "OBJECTS AND REASONS"]

    # Free-tier limits
    OCR_SPACE_DAILY_LIMIT = 500
    MAX_CONCURRENT_FREE = 2
    MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024  # 1 MB (free tier); PRO = 5 MB

    def __init__(self):
        self.ocr_space_key = os.environ.get("OCR_SPACE_API_KEY", "")
        self.cloudmersive_key = os.environ.get("CLOUDMERSIVE_API_KEY", "")

        # Daily request counter (UTC-day based)
        self._daily_counter_lock = threading.Lock()
        self._daily_counter = 0
        self._daily_counter_date = datetime.now(timezone.utc).date()

        # Concurrency semaphore for free-tier OCR.space
        self._ocr_space_semaphore = threading.Semaphore(self.MAX_CONCURRENT_FREE)

        # Metrics
        self.metrics = {
            "ocr_requests_total": 0,
            "ocr_requests_failed": 0,
            "ocr_requests_quota_exhausted": 0,
            "ocr_cloudmersive_total": 0,
            "ocr_cloudmersive_failed": 0,
            "total_processing_time_ms": 0,
        }

        # Audit log
        self._audit_log: List[Dict[str, Any]] = []

        if not self.ocr_space_key:
            logger.warning("OCR_SPACE_API_KEY not set – OCR.space fallback disabled.")
        if not self.cloudmersive_key:
            logger.warning("CLOUDMERSIVE_API_KEY not set – Cloudmersive fallback disabled.")

    # -------------------------------------------------------------------
    #  Public API: ocr_fallback
    # -------------------------------------------------------------------
    def ocr_fallback(self, pdf_bytes: bytes, pdf_url: str = "", title: str = "") -> Dict[str, Any]:
        """
        Main entry point. Attempts OCR on the given PDF bytes.

        Returns a dict with:
          - text: str (cleaned OCR text)
          - source: str ("ocr.space" | "cloudmersive" | "none")
          - engine: int or str
          - pages: list of page numbers processed
          - confidence_estimate: float or None
          - notes: str
          - metadata: dict with provenance info
        """
        start_time = time.time()
        result = {
            "text": "",
            "source": "none",
            "engine": None,
            "pages": [],
            "confidence_estimate": None,
            "notes": "",
            "metadata": {}
        }

        file_size = len(pdf_bytes)
        if file_size == 0:
            result["notes"] = "Empty PDF bytes provided."
            return result

        # Pre-trim large PDFs to maximize page extraction within 1MB free-tier limit
        if file_size > self.MAX_FILE_SIZE_BYTES:
            logger.info(f"      [OCR] PDF {file_size / 1024:.0f}KB exceeds 1MB free-tier limit. Adapting...")
            # Try to get as much as possible (usually first 3-5 pages depending on density)
            pdf_bytes = self._extract_first_pages(pdf_bytes, max_pages=5)
            file_size = len(pdf_bytes)
            
            # If still over 1MB, progressively drop pages until it fits
            for pages in [4, 3, 2, 1]:
                if file_size <= self.MAX_FILE_SIZE_BYTES:
                    break
                logger.info(f"      [OCR] Still too large ({file_size / 1024:.0f}KB). Trimming to {pages} pages...")
                pdf_bytes = self._extract_first_pages(pdf_bytes, max_pages=pages)
                file_size = len(pdf_bytes)

            logger.info(f"      [OCR] Final trimmed size: {file_size / 1024:.0f}KB ({len(pdf_bytes)} bytes)")

        # --- Step 1: Try OCR.space ---
        if self.ocr_space_key and not self._is_quota_exhausted():
            ocr_space_result = self._try_ocr_space(pdf_bytes, pdf_url, title)
            if ocr_space_result and self._passes_quality_gate(ocr_space_result.get("text", ""), title):
                elapsed_ms = int((time.time() - start_time) * 1000)
                self.metrics["total_processing_time_ms"] += elapsed_ms
                result.update(ocr_space_result)
                result["metadata"]["processing_time_ms"] = elapsed_ms
                self._record_audit("ocr.space", file_size, elapsed_ms, True)
                return result
            elif ocr_space_result:
                result["notes"] += "OCR.space returned text below quality gate. "

        # --- Step 2: Try Cloudmersive ---
        if self.cloudmersive_key:
            cloudmersive_result = self._try_cloudmersive(pdf_bytes, pdf_url, title)
            if cloudmersive_result and self._passes_quality_gate(cloudmersive_result.get("text", ""), title):
                elapsed_ms = int((time.time() - start_time) * 1000)
                self.metrics["total_processing_time_ms"] += elapsed_ms
                result.update(cloudmersive_result)
                result["metadata"]["processing_time_ms"] = elapsed_ms
                self._record_audit("cloudmersive", file_size, elapsed_ms, True)
                return result
            elif cloudmersive_result:
                result["notes"] += "Cloudmersive returned text below quality gate. "

        # --- Step 3: Return best partial result ---
        elapsed_ms = int((time.time() - start_time) * 1000)
        self.metrics["total_processing_time_ms"] += elapsed_ms
        if not result["text"]:
            result["notes"] += "All remote OCR providers failed or quota exhausted."
        result["metadata"]["processing_time_ms"] = elapsed_ms
        self._record_audit("none", file_size, elapsed_ms, False)
        return result

    # -------------------------------------------------------------------
    #  OCR.space Implementation
    # -------------------------------------------------------------------
    def _try_ocr_space(self, pdf_bytes: bytes, pdf_url: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Attempt OCR via OCR.space with Engine 2 → Engine 1 cascade.
        Sends the PDF as a file upload (or URL if file is too large).
        """
        # Try Engine 2 first (better for special chars, legislative docs)
        result = self._call_ocr_space(pdf_bytes, pdf_url, engine=2)
        if result and self._passes_quality_gate(result.get("text", ""), title):
            result["notes"] = "OCR.space Engine 2 succeeded."
            return result

        # Engine 2 failed or low quality → swap to Engine 1
        logger.info("      [OCR.space] Engine 2 insufficient, swapping to Engine 1...")
        result_e1 = self._call_ocr_space(pdf_bytes, pdf_url, engine=1)
        if result_e1 and result_e1.get("text", "").strip():
            # Use whichever produced more text
            if result and len(result.get("text", "")) > len(result_e1.get("text", "")):
                result["notes"] = "OCR.space Engine 2 produced more text than Engine 1."
                return result
            result_e1["notes"] = "OCR.space fallback to Engine 1."
            return result_e1

        # Return whatever we got (might be partial)
        return result

    def _call_ocr_space(self, pdf_bytes: bytes, pdf_url: str, engine: int) -> Optional[Dict[str, Any]]:
        """
        Single call to OCR.space POST endpoint with retry logic.
        Enforces daily quota and concurrency limits.
        """
        if self._is_quota_exhausted():
            logger.warning("      [OCR.space] Daily quota exhausted (500/day).")
            self.metrics["ocr_requests_quota_exhausted"] += 1
            return None

        self.metrics["ocr_requests_total"] += 1

        # File size check – if over 5MB, try URL method if available
        use_url = len(pdf_bytes) > self.MAX_FILE_SIZE_BYTES and pdf_url
        if len(pdf_bytes) > self.MAX_FILE_SIZE_BYTES and not pdf_url:
            logger.warning("      [OCR.space] File exceeds 5MB and no URL available. Sending first 3 pages.")
            pdf_bytes = self._extract_first_pages(pdf_bytes, max_pages=3)

        # Build request
        headers = {"apikey": self.ocr_space_key}
        data = {
            "language": "eng",
            "isOverlayRequired": "false",
            "scale": "true",
            "OCREngine": str(engine),
            "isTable": "true",
            "detectOrientation": "true",
        }

        acquired = self._ocr_space_semaphore.acquire(timeout=30)
        if not acquired:
            logger.warning("      [OCR.space] Concurrency limit reached (2 concurrent). Waiting timed out.")
            return None

        try:
            for attempt in range(3):  # 3 retries with exponential backoff
                try:
                    if use_url:
                        data["url"] = pdf_url
                        response = requests.post(
                            self.OCR_SPACE_ENDPOINT,
                            headers=headers,
                            data=data,
                            timeout=120
                        )
                    else:
                        files = {"file": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
                        response = requests.post(
                            self.OCR_SPACE_ENDPOINT,
                            headers=headers,
                            data=data,
                            files=files,
                            timeout=120
                        )

                    if response.status_code == 429:
                        logger.warning(f"      [OCR.space] Rate limited (429). Attempt {attempt + 1}/3.")
                        time.sleep((2 ** attempt) * 1)
                        continue

                    if response.status_code >= 500:
                        logger.warning(f"      [OCR.space] Server error ({response.status_code}). Attempt {attempt + 1}/3.")
                        time.sleep((2 ** attempt) * 1)
                        continue

                    self._increment_daily_counter()
                    resp_json = response.json()
                    return self._parse_ocr_space_response(resp_json, engine)

                except requests.exceptions.Timeout:
                    logger.warning(f"      [OCR.space] Timeout. Attempt {attempt + 1}/3.")
                    time.sleep((2 ** attempt) * 1)
                except requests.exceptions.ConnectionError:
                    logger.warning(f"      [OCR.space] Connection error. Attempt {attempt + 1}/3.")
                    time.sleep((2 ** attempt) * 1)
                except Exception as e:
                    logger.error(f"      [OCR.space] Unexpected error: {e}")
                    break

            self.metrics["ocr_requests_failed"] += 1
            return None
        finally:
            self._ocr_space_semaphore.release()

    def _parse_ocr_space_response(self, resp_json: dict, engine: int) -> Optional[Dict[str, Any]]:
        """Parse and validate the OCR.space JSON response."""
        if resp_json.get("IsErroredOnProcessing", True):
            error_msg = resp_json.get("ErrorMessage", "Unknown error")
            logger.warning(f"      [OCR.space] Processing error: {error_msg}")
            self.metrics["ocr_requests_failed"] += 1
            return None

        parsed_results = resp_json.get("ParsedResults", [])
        if not parsed_results:
            logger.warning("      [OCR.space] No parsed results returned.")
            self.metrics["ocr_requests_failed"] += 1
            return None

        # Aggregate text from all pages
        all_text = []
        pages_processed = []
        for i, pr in enumerate(parsed_results):
            exit_code = pr.get("FileParseExitCode", -1)
            if isinstance(exit_code, str):
                try:
                    exit_code = int(exit_code)
                except ValueError:
                    exit_code = -1

            if exit_code == 1:
                page_text = pr.get("ParsedText", "")
                if page_text:
                    all_text.append(page_text)
                    pages_processed.append(i + 1)
            else:
                error_detail = pr.get("ErrorMessage", "No error message")
                logger.warning(f"      [OCR.space] Page {i + 1} parse failed (exit {exit_code}): {error_detail}")

        combined_text = "\n".join(all_text).strip()
        processing_time = resp_json.get("ProcessingTimeInMilliseconds", "0")

        logger.info(f"      [OCR.space] Engine {engine}: {len(combined_text)} chars from {len(pages_processed)} pages ({processing_time}ms)")

        return {
            "text": combined_text,
            "source": "ocr.space",
            "engine": engine,
            "pages": pages_processed,
            "confidence_estimate": None,  # OCR.space free doesn't return confidence
            "notes": "",
            "metadata": {
                "ocr_processing_time_ms": processing_time,
                "exit_code": resp_json.get("OCRExitCode"),
                "pages_total": len(parsed_results),
                "pages_successful": len(pages_processed),
            }
        }

    # -------------------------------------------------------------------
    #  Cloudmersive Implementation
    # -------------------------------------------------------------------
    def _try_cloudmersive(self, pdf_bytes: bytes, pdf_url: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Attempt OCR via Cloudmersive as a secondary fallback.
        Uses /ocr/pdf/toText for PDF files.
        """
        self.metrics["ocr_cloudmersive_total"] += 1

        headers = {
            "Apikey": self.cloudmersive_key,
            "recognitionMode": "Advanced",
            "language": "ENG",
            "preprocessing": "Auto",
        }

        for attempt in range(3):
            try:
                files = {"imageFile": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
                response = requests.post(
                    self.CLOUDMERSIVE_ENDPOINT,
                    headers=headers,
                    files=files,
                    timeout=180
                )

                if response.status_code == 429:
                    logger.warning(f"      [Cloudmersive] Rate limited (429). Attempt {attempt + 1}/3.")
                    time.sleep((2 ** attempt) * 2)
                    continue

                if response.status_code >= 500:
                    logger.warning(f"      [Cloudmersive] Server error ({response.status_code}). Attempt {attempt + 1}/3.")
                    time.sleep((2 ** attempt) * 2)
                    continue

                if response.status_code == 401:
                    logger.error("      [Cloudmersive] Authentication failed (401). Check CLOUDMERSIVE_API_KEY.")
                    self.metrics["ocr_cloudmersive_failed"] += 1
                    return None

                resp_json = response.json()
                return self._parse_cloudmersive_response(resp_json)

            except requests.exceptions.Timeout:
                logger.warning(f"      [Cloudmersive] Timeout. Attempt {attempt + 1}/3.")
                time.sleep((2 ** attempt) * 2)
            except requests.exceptions.ConnectionError:
                logger.warning(f"      [Cloudmersive] Connection error. Attempt {attempt + 1}/3.")
                time.sleep((2 ** attempt) * 2)
            except Exception as e:
                logger.error(f"      [Cloudmersive] Unexpected error: {e}")
                break

        self.metrics["ocr_cloudmersive_failed"] += 1
        return None

    def _parse_cloudmersive_response(self, resp_json: dict) -> Optional[Dict[str, Any]]:
        """Parse and validate the Cloudmersive JSON response."""
        if not resp_json.get("Successful", False):
            logger.warning("      [Cloudmersive] OCR processing failed.")
            self.metrics["ocr_cloudmersive_failed"] += 1
            return None

        ocr_pages = resp_json.get("OcrPages", [])
        if not ocr_pages:
            logger.warning("      [Cloudmersive] No OCR pages returned.")
            self.metrics["ocr_cloudmersive_failed"] += 1
            return None

        all_text = []
        pages_processed = []
        total_confidence = 0
        confidence_count = 0

        for page in ocr_pages:
            page_num = page.get("PageNumber", 0)
            page_text = page.get("TextResult", "")
            confidence = page.get("MeanConfidenceLevel", 0)

            if page_text:
                all_text.append(page_text)
                pages_processed.append(page_num + 1)
                if confidence:
                    total_confidence += confidence
                    confidence_count += 1

        combined_text = "\n".join(all_text).strip()
        mean_confidence = (total_confidence / confidence_count) if confidence_count > 0 else None

        logger.info(f"      [Cloudmersive] {len(combined_text)} chars from {len(pages_processed)} pages (confidence: {mean_confidence})")

        return {
            "text": combined_text,
            "source": "cloudmersive",
            "engine": "Advanced",
            "pages": pages_processed,
            "confidence_estimate": mean_confidence,
            "notes": "",
            "metadata": {
                "pages_total": len(ocr_pages),
                "pages_successful": len(pages_processed),
                "mean_confidence": mean_confidence,
            }
        }

    # -------------------------------------------------------------------
    #  Quality Gates
    # -------------------------------------------------------------------
    def _passes_quality_gate(self, text: str, title: str = "") -> bool:
        """
        Validates OCR output quality.
        Accepts if text length >= MIN_TEXT_LENGTH OR contains key legislative tokens.
        """
        if not text or not text.strip():
            return False

        text_len = len(text.strip())
        if text_len >= self.MIN_TEXT_LENGTH:
            return True

        # Check for legislative tokens even if text is short
        text_upper = text.upper()
        for token in self.QUALITY_TOKENS:
            if token.upper() in text_upper:
                return True

        # Check if title appears in text
        if title and title.lower()[:20] in text.lower():
            return True

        return False

    # -------------------------------------------------------------------
    #  Quota Management
    # -------------------------------------------------------------------
    def _is_quota_exhausted(self) -> bool:
        """Check if the daily OCR.space free-tier quota (500/day) is exhausted."""
        with self._daily_counter_lock:
            today = datetime.now(timezone.utc).date()
            if today != self._daily_counter_date:
                self._daily_counter = 0
                self._daily_counter_date = today
            return self._daily_counter >= self.OCR_SPACE_DAILY_LIMIT

    def _increment_daily_counter(self):
        """Increment the daily request counter (thread-safe)."""
        with self._daily_counter_lock:
            today = datetime.now(timezone.utc).date()
            if today != self._daily_counter_date:
                self._daily_counter = 0
                self._daily_counter_date = today
            self._daily_counter += 1

    # -------------------------------------------------------------------
    #  Utility: Extract first N pages from PDF
    # -------------------------------------------------------------------
    def _extract_first_pages(self, pdf_bytes: bytes, max_pages: int = 3) -> bytes:
        """Extract the first N pages from a PDF to stay within free-tier limits."""
        if FITZ_OK:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                if len(doc) <= max_pages:
                    doc.close()
                    return pdf_bytes
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=0, to_page=max_pages - 1)
                result = new_doc.tobytes()
                new_doc.close()
                doc.close()
                logger.info(f"      [OCR] Trimmed PDF to first {max_pages} pages for free-tier compliance.")
                return result
            except Exception as e:
                logger.warning(f"      [OCR] Page extraction failed: {e}")
        return pdf_bytes

    # -------------------------------------------------------------------
    #  Audit & Metrics
    # -------------------------------------------------------------------
    def _record_audit(self, source: str, file_size: int, elapsed_ms: int, success: bool):
        """Record an audit entry for the OCR request."""
        self._audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "request_size_bytes": file_size,
            "processing_time_ms": elapsed_ms,
            "success": success,
            "daily_count": self._daily_counter,
        })

    def get_metrics(self) -> Dict[str, Any]:
        """Return current metrics snapshot."""
        return {
            **self.metrics,
            "daily_requests_used": self._daily_counter,
            "daily_requests_remaining": max(0, self.OCR_SPACE_DAILY_LIMIT - self._daily_counter),
        }


# ===================================================================
#  BillStructuralExtractor  –  Structural Breadcrumb Engine
# ===================================================================
class BillStructuralExtractor:
    """
    Implements the 'Structural Breadcrumb Strategy' for Kenyan Bills.
    Navigates PDF architecture to find Sponsors and constitutional metadata.
    """

    # --- Structural Anchors ---
    ANCHOR_MEMORANDUM = "MEMORANDUM OF OBJECTS AND REASONS"
    ANCHOR_ARTICLE_114 = "Article 114 of the Constitution"
    ANCHOR_COUNTY_GOVTS = "concerns County Governments"
    ANCHOR_ENACTED = "ENACTED by the Parliament of Kenya"
    ANCHOR_REFERENCE = "which it is proposed to amend"

    # --- Regex Patterns ---
    DATE_PATTERNS = [
        re.compile(r'[Dd]ated\s+the\s+(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Z][a-z]+),?\s+(\d{4})'),
        re.compile(r'DATED\s+THE\s+(\d+)\s+DAY\s+OF\s+([A-Z]+)\s+(\d{4})', re.I)
    ]
    MONEY_BILL_PATTERNS = [
        re.compile(r'is\s+a\s+money\s+Bill', re.I),
        re.compile(r'is\s+not\s+a\s+money\s+Bill', re.I)
    ]
    COUNTY_GOVT_PATTERNS = [
        re.compile(r'does\s+concern\s+County\s+Governments', re.I),
        re.compile(r'does\s+not\s+concern\s+County\s+Governments', re.I)
    ]

    @staticmethod
    def extract_all(pdf_bytes: bytes, title: str) -> Dict[str, Any]:
        """Entry point for structural extraction."""
        result = {
            "bill_type": "Principal",
            "sponsor_name": None,
            "sponsor_title": None,
            "date_signed": None,
            "is_money_bill": None,
            "concerns_counties": None,
            "has_toc": False,
            "structural_method": "none"
        }

        if "(Amendment)" in title or "Amendment to" in title:
            result["bill_type"] = "Amendment"

        if not FITZ_OK:
            return result

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Layer 1: Native TOC
            toc = doc.get_toc()
            memo_page = -1
            if toc:
                result["has_toc"] = True
                for entry in toc:
                    if "MEMORANDUM" in entry[1].upper():
                        memo_page = entry[2] - 1 # 0-indexed
                        result["structural_method"] = "native_toc"
                        break

            # Layer 2: Skeleton Scan for anchors if TOC failed
            if memo_page == -1:
                for i in range(len(doc)):
                    page_text = doc[i].get_text()
                    if BillStructuralExtractor.ANCHOR_MEMORANDUM in page_text:
                        memo_page = i
                        result["structural_method"] = "skeleton_scan"
                        break
            
            # Layer 3: Extraction from identified page
            if memo_page != -1:
                # Get text from memo page and the next one (memos can span multiple pages)
                end_page = min(memo_page + 2, len(doc))
                memo_text = ""
                for i in range(memo_page, end_page):
                    memo_text += doc[i].get_text()

                # --- 1. Money Bill Status ---
                if BillStructuralExtractor.ANCHOR_ARTICLE_114 in memo_text:
                    m = BillStructuralExtractor.MONEY_BILL_PATTERNS[0].search(memo_text)
                    nm = BillStructuralExtractor.MONEY_BILL_PATTERNS[1].search(memo_text)
                    if nm: result["is_money_bill"] = False
                    elif m: result["is_money_bill"] = True

                # --- 2. County Govts Status ---
                if BillStructuralExtractor.ANCHOR_COUNTY_GOVTS in memo_text:
                    m = BillStructuralExtractor.COUNTY_GOVT_PATTERNS[0].search(memo_text)
                    nm = BillStructuralExtractor.COUNTY_GOVT_PATTERNS[1].search(memo_text)
                    if nm: result["concerns_counties"] = False
                    elif m: result["concerns_counties"] = True

                # --- 3. Sponsor & Date ---
                # Find date anchor
                date_match = None
                for pat in BillStructuralExtractor.DATE_PATTERNS:
                    date_match = pat.search(memo_text)
                    if date_match:
                        break
                
                if date_match:
                    result["date_signed"] = date_match.group(0)
                    # The name is usually the next line (ALL CAPS)
                    # We take the 500 characters following the date
                    after_date = memo_text[date_match.end():date_match.end()+500]
                    lines = [line.strip() for line in after_date.split('\n') if line.strip()]
                    
                    for line in lines:
                        # Sponsor name is usually ALL CAPS and at least 5 chars
                        if line.isupper() and len(line) > 5:
                            result["sponsor_name"] = line
                            # Check next line for title
                            idx = lines.index(line)
                            if idx + 1 < len(lines):
                                result["sponsor_title"] = lines[idx+1]
                            break

            doc.close()
        except Exception as e:
            logger.warning(f"      [Structural] Extraction failed: {e}")

        return result


# ===================================================================
#  LegislativeScraper  –  Selective Deep Extraction Engine
# ===================================================================
class LegislativeScraper:
    """
    Production-grade legislative scraper for the Kenyan Parliament website.

    Extraction logic:
      1. Scrape listing page for PDF links and metadata.
      2. For Bills:
         a. Attempt cascading PDF text extraction (PyMuPDF -> PyPDF2 -> pdfplumber).
         b. If PDF is scanned (no text), trigger Remote OCR (OCR.space → Cloudmersive).
         c. If remote OCR also fails, selectively visit the Bill's detail page (node)
            to extract HTML-based summary and description.
      3. For Non-Bill Docs: Scrape as-is (no deep parsing).

    This route uses OCR.space free plan; daily quota 500/day; for high-volume use
    upgrade to PRO or configure secondary provider (Cloudmersive).
    """

    def __init__(self, headless: bool = True):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.targets_file = os.path.join(script_dir, "scraping_targets.json")
        self.headless = headless
        self.data: List[Dict[str, Any]] = []
        self.seen_titles: set = set()
        self.targets = self._load_targets()
        self.ocr_engine = RemoteOCREngine()
        self.b2_vault = None
        if B2_OK:
            try:
                self.b2_vault = BackblazeVault()
                logger.info("B2 Vault initialized for PDF mirroring.")
            except Exception as e:
                logger.warning(f"B2 Vault init failed (non-fatal): {e}")
        
        self.orchestrator = MultiLLMOrchestrator() if ORCHESTRATOR_OK else None
        if TESSERACT_OK:
            # Attempt to locate tesseract on Windows if not in PATH
            tess_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            if os.path.exists(tess_path):
                pytesseract.pytesseract.tesseract_cmd = tess_path

    def _load_targets(self) -> list:
        try:
            with open(self.targets_file, 'r', encoding='utf-8') as f:
                return json.load(f).get("targets", [])
        except Exception as e:
            logger.error(f"Failed to load targets: {e}")
            return []

    def scrape_all(self, max_pages: int = 15) -> List[Dict[str, Any]]:
        logger.info("=" * 60)
        logger.info("  GO-HAM Legislative Sync Engine  (Selective Deep v5 + Remote OCR)")
        logger.info("=" * 60)

        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.error("Playwright not installed.")
            return []

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=self.headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ]
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                }
            )
            page = ctx.new_page()

            for target in self.targets:
                logger.info(f"\n>>> Syncing: {target['name']}")
                try:
                    if target['type'] == 'bills':
                        self._scrape_bills(page, target, max_pages)
                    else:
                        self._scrape_standard_docs(page, target)
                except Exception as e:
                    logger.error(f"  Target failed: {e}")

            browser.close()

        # Log OCR metrics at end of run
        metrics = self.ocr_engine.get_metrics()
        logger.info(f"\n--- OCR Metrics ---")
        logger.info(f"  OCR.space requests: {metrics['ocr_requests_total']} (failed: {metrics['ocr_requests_failed']}, quota exhausted: {metrics['ocr_requests_quota_exhausted']})")
        logger.info(f"  Cloudmersive requests: {metrics['ocr_cloudmersive_total']} (failed: {metrics['ocr_cloudmersive_failed']})")
        logger.info(f"  Daily quota remaining: {metrics['daily_requests_remaining']}/{self.ocr_engine.OCR_SPACE_DAILY_LIMIT}")
        logger.info(f"  Total OCR processing time: {metrics['total_processing_time_ms']}ms")

        logger.info(f"\nSync complete – {len(self.data)} items scraped")
        return self.data

    def _scrape_bills(self, page, target: dict, max_pages: int):
        base_url = target['url']

        for page_num in range(max_pages):
            page_url = f"{base_url}?title=%20&field_parliament_value=2022&page={page_num}"
            logger.info(f"  Page {page_num + 1}: {page_url}")

            try:
                page.goto(page_url, wait_until="networkidle", timeout=60000)
                
                # Extract potential bill rows with detail links
                rows = page.evaluate("""() => {
                    const rowSelector = '.views-row, tr:has(a)';
                    return Array.from(document.querySelectorAll(rowSelector)).map(row => {
                        const links = Array.from(row.querySelectorAll('a')).map(a => ({
                            text: a.textContent.trim(),
                            href: a.href,
                            isPdf: a.href.toLowerCase().endsWith('.pdf')
                        }));
                        return {
                            rowText: row.innerText.trim(),
                            links: links
                        };
                    }).filter(r => r.links.some(l => l.isPdf));
                }""")

                for row in rows:
                    pdf_link = next(l for l in row['links'] if l['isPdf'])
                    detail_link = next((l for l in row['links'] if not l['isPdf'] and 'node/' in l['href']), None)
                    
                    raw_title = pdf_link['text'] or self._title_from_url(pdf_link['href'])
                    title = self._clean_title(raw_title)
                    
                    if not title or title in self.seen_titles: continue
                    self.seen_titles.add(title)
                    
                    if not self._is_bill_document(title):
                        self.data.append(self._build_non_bill_record(title, pdf_link['href'], target))
                        continue

                    # Deep Process Bill
                    record = self._deep_process_bill(page, title, pdf_link['href'], detail_link['href'] if detail_link else None, target)
                    self.data.append(record)
                    logger.info(f"    [BILL] {title}")

                if not page.query_selector('li.pager-next a, a[rel="next"]'): break
                time.sleep(0.5)

            except Exception as e:
                logger.error(f"  Page {page_num} error: {e}")
                break

    def _deep_process_bill(self, page, title, pdf_url, detail_url, target) -> dict:
        """Cascading extraction: PDF Text -> Remote OCR -> Screenshot OCR -> HTML Metadata Fallback."""
        text = ""
        method = None
        is_scanned = False
        ocr_metadata = {}
        
        # 1. Primary: PDF Text Extraction (local cascade)
        pdf_bytes = self._download_pdf(pdf_url, page)
        if pdf_bytes:
            text, method = self._extract_text_cascade(pdf_bytes)
            if not text.strip():
                is_scanned = True
        else:
            # PDF URL returned HTML (not a real PDF file)
            is_scanned = True
        
        # 2. Secondary: Remote OCR Fallback on real PDF bytes
        if is_scanned and pdf_bytes:
            logger.info(f"      [OCR] Scanned PDF detected for: {title}")
            ocr_result = self.ocr_engine.ocr_fallback(pdf_bytes, pdf_url=pdf_url, title=title)
            if ocr_result["text"].strip():
                text = ocr_result["text"]
                method = f"remote_ocr:{ocr_result['source']}:engine_{ocr_result['engine']}"
                is_scanned = False  # We got text via OCR!
                ocr_metadata = {
                    "ocr_source": ocr_result["source"],
                    "ocr_engine": ocr_result["engine"],
                    "ocr_pages": ocr_result["pages"],
                    "ocr_confidence": ocr_result["confidence_estimate"],
                    "ocr_notes": ocr_result["notes"],
                }
                logger.info(f"      [OCR] SUCCESS via {ocr_result['source']} (engine {ocr_result['engine']}): {len(text)} chars")
            else:
                logger.warning(f"      [OCR] PDF-based OCR failed for: {title}")

        # 3. Screenshot-based OCR: Navigate to the bill page, capture screenshots, OCR them
        if is_scanned and (pdf_url or detail_url):
            target_url = detail_url or pdf_url
            logger.info(f"      [OCR] Attempting screenshot-based OCR on: {target_url}")
            screenshot_text, screenshot_meta = self._ocr_page_screenshots(page, target_url, title)
            if screenshot_text.strip():
                text = screenshot_text
                method = f"screenshot_ocr:{screenshot_meta.get('source', 'ocr.space')}"
                is_scanned = False
                ocr_metadata = screenshot_meta
                logger.info(f"      [OCR] Screenshot OCR SUCCESS: {len(text)} chars")
            else:
                logger.warning(f"      [OCR] Screenshot OCR also failed for: {title}")

        # 4. Tertiary: If still no text, fetch HTML metadata from detail page
        html_metadata = {}
        if is_scanned and detail_url:
            html_metadata = self._scrape_bill_detail_page(page, detail_url)
        
        # 5. Deep local OCR as a last resort on first page
        if is_scanned and not text.strip() and pdf_bytes and TESSERACT_OK:
            try:
                # Convert first page to image and run tesseract
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                if len(doc) > 0:
                    page0 = doc[0]
                    pix = page0.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    text = pytesseract.image_to_string(img)
                    if text.strip():
                        method = "local_tesseract"
                        is_scanned = False
                        logger.info(f"      [OCR] Local Tesseract SUCCESS: {len(text)} chars")
                doc.close()
            except Exception as e:
                logger.warning(f"      [OCR] Local Tesseract failed: {e}")

        # 6. Parse and Merge (High Fidelity Distillation)
        intel = {}
        if text.strip() and self.orchestrator:
            logger.info(f"      [INTEL] Running Multi-LLM Distillation for: {title}")
            intel = self._distill_bill_content(text, title)
            if intel:
                logger.info(f"      [INTEL] Distillation SUCCESS for: {title}")

        # 7. Structural Extraction (The Breadcrumb Strategy)
        structural_data = {}
        if pdf_bytes:
            logger.info(f"      [Structural] Running breadcrumb analysis for: {title}")
            structural_data = BillStructuralExtractor.extract_all(pdf_bytes, title)
            if structural_data.get("sponsor_name"):
                logger.info(f"      [Structural] Found Sponsor: {structural_data['sponsor_name']}")

        # Legacy Parse (Maintain for safety/preservation)
        parsed_pdf = self._parse_bill_text(text) if text.strip() else {}
        
        # Final fields - Prioritize Structural > Intelligence > Parsed
        sponsor = structural_data.get('sponsor_name') or intel.get('sponsor') or parsed_pdf.get('sponsor') or html_metadata.get('sponsor') or "Government"
        sponsor_title = structural_data.get('sponsor_title')
        status = intel.get('status') or html_metadata.get('status') or self._infer_status_from_text(text, title)
        
        # FIX: Ensure status is never null for any record type
        if not status:
            if target.get('type') == 'bills':
                status = "Published"
            else:
                status = "Ingested"

        summary = intel.get('summary') or parsed_pdf.get('summary') or html_metadata.get('summary')
        description = intel.get('short_title') or parsed_pdf.get('description') or title
        ai_concerns = intel.get('ai_concerns', [])
        tabloid_summary = intel.get('tabloid_summary', "")
        constitutional_section = intel.get('constitutional_section', "")

        if not summary:
            summary = f"Legislative bill tracked from {target['name']}. (Scanned PDF - detailed content unavailable)" if is_scanned else f"Bill: {title}"

        year = self._extract_year(title) or str(datetime.now().year)
        
        extraction_method = method or ("html" if html_metadata else "none")
        if ocr_metadata:
            extracted_via = f"ocr:{ocr_metadata.get('ocr_source', 'unknown')}"
        elif method and method.startswith("remote_ocr"):
            extracted_via = method
        elif method:
            extracted_via = f"local:{method}"
        else:
            extracted_via = "html_fallback" if html_metadata else "none"

        # --- B2 Vault: Mirror PDF to Backblaze ---
        b2_url = None
        if self.b2_vault and pdf_bytes:
            safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)[:80]
            remote_path = f"public-docs/bills/{year}/{safe_title}.pdf"
            try:
                if not self.b2_vault.file_exists(remote_path):
                    b2_url = self.b2_vault.upload_bytes(pdf_bytes, remote_path, content_type="application/pdf")
                    logger.info(f"      [B2] Mirrored to vault: {remote_path}")
                else:
                    b2_url = self.b2_vault.get_public_url(remote_path)
                    logger.info(f"      [B2] Already in vault: {remote_path}")
            except Exception as e:
                logger.warning(f"      [B2] Upload failed (non-fatal): {e}")

        # --- Date: extract real date from text if possible ---
        real_date = parsed_pdf.get('date') or html_metadata.get('date')
        if not real_date and text.strip() and STAGE_DETECTOR_OK:
            real_date = extract_date_from_order_paper(text)
        if not real_date:
            real_date = datetime.now().strftime("%Y-%m-%d")

        return {
            "title": title,
            "bill_no": self._extract_bill_no(text or title),
            "session_year": int(year),
            "sponsor": sponsor,
            "sponsor_title": sponsor_title,
            "status": status,
            "house": "Senate" if "Senate" in target['name'] else "National Assembly",
            "date": real_date,
            "url": pdf_url,
            "pdf_url": pdf_url,
            "b2_url": b2_url,
            "source": target['name'],
            "category": self._infer_category(title),
            "summary": summary[:3000],
            "description": description[:2000],
            "text_content": text if text.strip() else None,
            "ai_concerns": ai_concerns,
            "tabloid_summary": tabloid_summary,
            "constitutional_section": constitutional_section,
            "is_money_bill": structural_data.get("is_money_bill"),
            "concerns_counties": structural_data.get("concerns_counties"),
            "metadata": {
                "scraped_at": datetime.now(timezone.utc).isoformat(),
                "extraction_method": extraction_method,
                "extracted_via": extracted_via,
                "is_scanned": is_scanned,
                "b2_url": b2_url,
                "distilled_via": "multi_llm" if intel else "regex",
                "structural_method": structural_data.get("structural_method"),
                "bill_type": structural_data.get("bill_type"),
                "date_signed": structural_data.get("date_signed"),
                **ocr_metadata,
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    def _distill_bill_content(self, text: str, title: str) -> Dict[str, Any]:
        """Use Multi-LLM Orchestrator to extract structured intelligence from bill text."""
        if not self.orchestrator: return {}
        
        system_prompt = """You are a senior legislative analyst for the Parliament of Kenya.
Extract high-fidelity intelligence from the provided Bill text.
Return EXACTLY a JSON object with these keys:
{
  "short_title": "Action-oriented descriptive title",
  "sponsor": "Exact name of the mover/sponsor Hon. X or Cabinet Secretary",
  "summary": "Professional 2-paragraph summary of legal ramifications",
  "constitutional_section": "List relevant chapters/sections of the Constitution of Kenya (e.g. Chapter 12, Article 201) affected",
  "ai_concerns": ["List of 3-5 practical concerns for a common citizen in English and Swahili"],
  "tabloid_summary": "Catchy 3-sentence summary in plain English for a general audience",
  "status": "Current legislative status if explicitly stated in text (e.g. Published, First Reading, Second Reading)"
}"""

        prompt = f"Bill Title: {title}\n\nDocument Text:\n{text[:20000]}\n\nFinal Output (JSON):"
        
        try:
            return self.orchestrator.get_structured_intelligence(prompt, system_prompt)
        except Exception as e:
            logger.error(f"      [INTEL] Distillation failed: {e}")
            return {}

    def _ocr_page_screenshots(self, page, url: str, title: str) -> Tuple[str, dict]:
        """
        Navigate to a bill's page, capture full-page screenshots, and OCR them.
        Used when the parliament site serves HTML instead of a downloadable PDF.
        Returns (text, metadata_dict).
        """
        if not self.ocr_engine.ocr_space_key:
            return "", {}

        try:
            dp = page.context.new_page()
            dp.goto(url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(1)  # Let page render

            # Get the main content area height to determine how many screenshots
            viewport_height = dp.viewport_size["height"]
            page_height = dp.evaluate("document.body.scrollHeight")
            max_screenshots = min(3, max(1, page_height // viewport_height + 1))

            all_text = []
            pages_processed = []

            for i in range(max_screenshots):
                # Scroll to position
                scroll_y = i * viewport_height
                dp.evaluate(f"window.scrollTo(0, {scroll_y})")
                time.sleep(0.3)

                # Capture screenshot as PNG bytes
                screenshot_bytes = dp.screenshot(type="png")

                if len(screenshot_bytes) > self.ocr_engine.MAX_FILE_SIZE_BYTES:
                    logger.warning(f"      [Screenshot OCR] Screenshot {i+1} exceeds 1MB ({len(screenshot_bytes)} bytes), skipping.")
                    continue

                # Send to OCR.space
                if self.ocr_engine._is_quota_exhausted():
                    logger.warning("      [Screenshot OCR] OCR.space daily quota exhausted.")
                    break

                try:
                    # Encode as base64 for OCR.space
                    b64_data = base64.b64encode(screenshot_bytes).decode('utf-8')
                    b64_string = f"data:image/png;base64,{b64_data}"

                    response = requests.post(
                        self.ocr_engine.OCR_SPACE_ENDPOINT,
                        headers={"apikey": self.ocr_engine.ocr_space_key},
                        data={
                            "base64Image": b64_string,
                            "language": "eng",
                            "isOverlayRequired": "false",
                            "scale": "true",
                            "OCREngine": "1",
                        },
                        timeout=120
                    )
                    self.ocr_engine._increment_daily_counter()
                    self.ocr_engine.metrics["ocr_requests_total"] += 1

                    rj = response.json()
                    if not rj.get("IsErroredOnProcessing", True):
                        for pr in rj.get("ParsedResults", []):
                            exit_code = pr.get("FileParseExitCode")
                            if isinstance(exit_code, str):
                                try: exit_code = int(exit_code)
                                except: exit_code = -1
                            if exit_code == 1:
                                pt = pr.get("ParsedText", "")
                                if pt.strip():
                                    all_text.append(pt)
                                    pages_processed.append(i + 1)
                        logger.info(f"      [Screenshot OCR] Page {i+1}: {len(all_text[-1]) if all_text else 0} chars")
                    else:
                        err = rj.get("ErrorMessage", "Unknown")
                        logger.warning(f"      [Screenshot OCR] Page {i+1} error: {err}")
                        self.ocr_engine.metrics["ocr_requests_failed"] += 1

                except Exception as e:
                    logger.warning(f"      [Screenshot OCR] Request failed for page {i+1}: {e}")
                    self.ocr_engine.metrics["ocr_requests_failed"] += 1

            dp.close()

            combined = "\n".join(all_text).strip()
            meta = {
                "ocr_source": "ocr.space",
                "ocr_engine": 1,
                "ocr_method": "screenshot",
                "ocr_pages": pages_processed,
                "ocr_notes": f"Screenshot-based OCR on {len(pages_processed)} viewport captures",
            }
            return combined, meta

        except Exception as e:
            logger.warning(f"      [Screenshot OCR] Failed: {e}")
            return "", {}

    def _scrape_bill_detail_page(self, page, url) -> dict:
        """Visit the bill's node page for HTML metadata."""
        try:
            logger.info(f"      [Fallback] Scraped Detail Page: {url}")
            dp = page.context.new_page()
            dp.goto(url, wait_until="domcontentloaded", timeout=30000)
            data = dp.evaluate("""() => {
                const results = {};
                // Look for common metadata labels
                document.querySelectorAll('tr, .field').forEach(el => {
                    const text = el.innerText.toLowerCase();
                    if (text.includes('sponsor')) results.sponsor = el.innerText.split(':').pop().trim();
                    if (text.includes('status') || text.includes('stage')) results.status = el.innerText.split(':').pop().trim();
                    if (text.includes('date')) results.date = el.innerText.split(':').pop().trim();
                });
                // Look for summary/digest
                const digest = document.querySelector('.field-name-field-bill-digest, .content, #block-system-main');
                if (digest) results.summary = digest.innerText.trim().substring(0, 3000);
                return results;
            }""")
            dp.close()
            return data
        except Exception as e:
            logger.warning(f"      Detail page scrape failed: {e}")
            return {}

    def _extract_text_cascade(self, pdf_bytes: bytes) -> Tuple[str, Optional[str]]:
        # PyMuPDF
        if FITZ_OK:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                text = "\n".join(p.get_text() for p in doc)
                doc.close()
                if text.strip(): return text, "pymupdf"
            except: pass
        # PyPDF2
        if PYPDF2_OK:
            try:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                text = "\n".join(p.extract_text() or "" for p in reader.pages)
                if text.strip(): return text, "pypdf2"
            except: pass
        # pdfplumber
        if PDFPLUMBER_OK:
            try:
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                    if text.strip(): return text, "pdfplumber"
            except: pass
        return "", None

    def _parse_bill_text(self, text: str) -> dict:
        result = {}

        # --- Summary extraction (cascading patterns) ---
        summary_patterns = [
            # Pattern 1: MEMORANDUM OF OBJECTS AND REASONS (most common)
            re.compile(r'MEMORANDUM\s+OF\s+OBJECTS\s+AND\s+REASONS(.*?)(?:$|Dated\s+the|\Z)', re.S | re.I),
            # Pattern 2: OBJECTS AND REASONS
            re.compile(r'OBJECTS\s+AND\s+REASONS(.*?)(?:$|Dated\s+the|\Z)', re.S | re.I),
            # Pattern 3: OBJECTS OF THE BILL
            re.compile(r'OBJECTS\s+OF\s+THE\s+BILL(.*?)(?:PART\s+I|ENACTED|Dated|\Z)', re.S | re.I),
            # Pattern 4: STATEMENT OF JUSTIFICATION
            re.compile(r'STATEMENT\s+OF\s+(?:THE\s+)?JUSTIFICATION(.*?)(?:$|Dated|\Z)', re.S | re.I),
            # Pattern 5: PURPOSE OF THE BILL
            re.compile(r'PURPOSE\s+OF\s+THE\s+BILL(.*?)(?:PART\s+I|ENACTED|Dated|\Z)', re.S | re.I),
            # Pattern 6: ARRANGEMENT OF CLAUSES (fall back to clause listing)
            re.compile(r'ARRANGEMENT\s+OF\s+CLAUSES(.*?)(?:A\s+Bill\s+for|PART\s+I|\Z)', re.S | re.I),
        ]
        for pat in summary_patterns:
            m = pat.search(text)
            if m:
                extracted = re.sub(r'\s+', ' ', m.group(1).strip())
                if len(extracted) > 30:
                    result['summary'] = extracted[:3000]
                    break

        # --- Description extraction (cascading patterns) ---
        desc_patterns = [
            # Pattern 1: "A Bill for AN ACT of Parliament to..."
            re.compile(r'(A\s+Bill\s+for\s+AN\s+ACT\s+of\s+Parliament\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            # Pattern 2: "AN ACT of Parliament to..."
            re.compile(r'(AN\s+ACT\s+of\s+Parliament\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            # Pattern 3: "An Act to..." (shorter form)
            re.compile(r'(An\s+Act\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            # Pattern 4: Long title after bill number
            re.compile(r'Bill\s+No\.?\s*\d+.*?\n(.*?)(?:PART\s+I|ARRANGEMENT)', re.S | re.I),
        ]
        for pat in desc_patterns:
            m = pat.search(text)
            if m:
                extracted = re.sub(r'\s+', ' ', m.group(1).strip())
                if len(extracted) > 20:
                    result['description'] = extracted[:2000]
                    break

        # --- Sponsor extraction ---
        sponsor_patterns = [
            re.compile(r'(?:Moved|Tabled|Introduced|Presented)\s+by[:\s]+(?:The\s+)?(?:Hon\.?\s+)?(.*?)(?:\s*,\s*M\.?P\.?|\s*,\s*MP|\n|$)', re.I),
            re.compile(r'(?:Cabinet\s+Secretary\s+for\s+)(\w[\w\s,]+?)(?:\.|\n|$)', re.I),
            re.compile(r'(?:Authored\s+by|Sponsored\s+by)[:\s]+(.*?)(?:\.|\n|$)', re.I),
        ]
        for pat in sponsor_patterns:
            m = pat.search(text[:2000])
            if m:
                sponsor = m.group(1).strip()
                if len(sponsor) > 2 and len(sponsor) < 200:
                    result['sponsor'] = sponsor
                    break

        # --- Date extraction from text ---
        date_patterns = [
            re.compile(r'Dated\s+the\s+(\d{1,2})\s*(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})', re.I),
            re.compile(r'(\d{1,2})\s*(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})', re.I),
        ]
        MONTHS = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        for pat in date_patterns:
            m = pat.search(text)
            if m:
                try:
                    day = int(m.group(1))
                    month = MONTHS.get(m.group(2).lower(), 0)
                    year = int(m.group(3))
                    if month and 1 <= day <= 31:
                        result['date'] = f"{year}-{month:02d}-{day:02d}"
                        break
                except (ValueError, IndexError):
                    pass

        return result

    def _scrape_standard_docs(self, page, target):
        page.goto(target['url'], wait_until="networkidle")
        links = page.evaluate("""(sel) => {
            return Array.from(document.querySelectorAll(sel || 'a[href$=".pdf"]')).map(a => ({
                text: a.innerText.trim(),
                href: a.href
            }));
        }""", target.get('selector'))
        for l in links:
            if not l['text'] or l['text'] in self.seen_titles: continue
            self.seen_titles.add(l['text'])
            self.data.append(self._build_non_bill_record(l['text'], l['href'], target))
            logger.info(f"    [DOC] {l['text']}")

    def _build_non_bill_record(self, title, url, target):
        return {
            "title": title,
            "url": url,
            "source": target['name'],
            "category": "Documentation",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": "Ingested", # FIX: Set status for non-bill docs
            "document_type": "doc"
        }

    # --- Hardened Bill Classification ---
    _BILL_BLOCKLIST = (
        'hansard', 'order paper', 'bill digest', 'questions',
        'notice of motion', 'petitions', 'committee report',
        'sessional paper', 'supplement', 'gazette notice',
        'votes and proceedings', 'speaker', 'adjournment',
        'business paper', 'progress report', 'standing orders',
        'procedural motion', 'government statement',
        'swearing in', 'obituary', 'tributes',
    )
    _BILL_REQUIRED_PATTERN = re.compile(
        r'\b(bill|bills|amendment\s+bill|finance\s+bill|appropriation\s+bill|supply\s+bill)\b',
        re.I
    )

    def _is_bill_document(self, title: str) -> bool:
        t = title.lower()
        # Must contain a valid bill pattern
        if not self._BILL_REQUIRED_PATTERN.search(t):
            return False
        # Must not match any blocklisted document type
        for kw in self._BILL_BLOCKLIST:
            if kw in t:
                return False
        return True

    def _clean_title(self, raw: str) -> str:
        t = re.sub(r'\.(pdf|docx?|html?)$', '', raw, flags=re.I).strip()
        return re.sub(r'\s+', ' ', t)

    def _title_from_url(self, url: str) -> str:
        return unquote(url.split('/')[-1]).replace('.pdf','')

    def _extract_year(self, text: str) -> Optional[str]:
        m = re.search(r'\b(202[2-9])\b', text)
        return m.group(0) if m else None

    def _extract_bill_no(self, text: str) -> str:
        m = re.search(r'Bill No\.? (\d+)', text, re.I)
        return f"No. {m.group(1)}" if m else ""

    def _infer_status_from_text(self, text: str, title: str) -> str:
        t = title.lower() + " " + text[:500].lower()
        if 'assent' in t: return "Assented"
        if 'reading' in t: return "Reading"
        return "Publication"

    def _infer_category(self, title: str) -> str:
        return "All Portfolios"

    def _download_pdf(self, url: str, page=None) -> Optional[bytes]:
        """Download a PDF, with PDF magic byte validation and Playwright fallback."""
        pdf_bytes = None

        # Method 1: Direct HTTP request
        if REQUESTS_OK:
            try:
                r = requests.get(url, timeout=30, allow_redirects=True)
                if r.content[:5] == b"%PDF-":
                    pdf_bytes = r.content
                    logger.info(f"      [DL] PDF downloaded via requests: {len(pdf_bytes)} bytes")
                    return pdf_bytes
                else:
                    logger.info(f"      [DL] URL returned non-PDF content (Content-Type: {r.headers.get('Content-Type', 'unknown')}). Trying Playwright...")
            except Exception as e:
                logger.warning(f"      [DL] requests.get failed: {e}. Trying Playwright...")

        # Method 2: Playwright-based download (uses browser session cookies)
        if page:
            try:
                with page.context.expect_event("page") as page_info:
                    page.evaluate(f"window.open('{url}')")
                new_page = page_info.value
                new_page.wait_for_load_state("load")
                # Try to get the response body
                response = new_page.goto(url, wait_until="load", timeout=30000)
                if response:
                    body = response.body()
                    if body[:5] == b"%PDF-":
                        pdf_bytes = body
                        logger.info(f"      [DL] PDF downloaded via Playwright response: {len(pdf_bytes)} bytes")
                new_page.close()
                if pdf_bytes:
                    return pdf_bytes
            except Exception:
                pass

            # Method 3: Playwright download event handler
            try:
                with page.expect_download(timeout=30000) as download_info:
                    page.evaluate(f"""() => {{
                        const a = document.createElement('a');
                        a.href = '{url}';
                        a.download = 'bill.pdf';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }}""")
                download = download_info.value
                temp_path = download.path()
                if temp_path:
                    with open(temp_path, 'rb') as f:
                        pdf_bytes = f.read()
                    if pdf_bytes and pdf_bytes[:5] == b"%PDF-":
                        logger.info(f"      [DL] PDF downloaded via Playwright download: {len(pdf_bytes)} bytes")
                        return pdf_bytes
                    pdf_bytes = None
            except Exception as e:
                logger.warning(f"      [DL] Playwright download failed: {e}")

            # Method 4: Use Playwright's request API to fetch with browser cookies
            try:
                api_response = page.context.request.get(url)
                body = api_response.body()
                if body[:5] == b"%PDF-":
                    pdf_bytes = body
                    logger.info(f"      [DL] PDF downloaded via Playwright API request: {len(pdf_bytes)} bytes")
                    return pdf_bytes
            except Exception as e:
                logger.warning(f"      [DL] Playwright API request failed: {e}")

        logger.warning(f"      [DL] All download methods failed for: {url}")
        return None

    def save_data(self):
        fpath = f"processed_data/legislative/legislation_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved to {fpath}")

if __name__ == "__main__":
    scraper = LegislativeScraper(headless=True)
    scraper.scrape_all(max_pages=2)
    scraper.save_data()
