"""
ocr_worker.py — Async OCR Worker (Decoupled from Main Pipeline)
================================================================
This script runs independently of sovereign_corroborator.py.
It polls the Supabase `bills` table for rows where:
  - `requires_heavy_ocr` = true   (flagged by the corroborator when Tesseract fallback is needed)
  - `text_content` IS NULL or very short (no usable text yet)

For each such bill it:
  1. Downloads the PDF via the tiered proxy chain (Webshare → ScraperAPI)
  2. Attempts OCR through a tiered provider chain:
       Tier A — OCR.space  (fast cloud, good for most scanned docs)
       Tier B — Google Cloud Vision (superior for low-contrast scans, non-English text)
       Tier C — Local Tesseract with preprocessing (deskew + binarize via Pillow)
  3. Commits the extracted text back to `bills.text_content`
  4. Clears `requires_heavy_ocr` = false so it is not reprocessed

This worker is intentionally slow and thorough. It can be run on a separate
cron schedule (e.g., every 6 hours) without ever blocking the fast AI synthesis loop.

Pipeline position:
  reprocess_all_bills.py (flags requires_heavy_ocr=true) 
  → sovereign_corroborator.py (skips flagged bills, processes fast ones)
  → ocr_worker.py (catches flagged bills, commits text, re-enables corroboration next cycle)
"""

import os
import io
import time
import random
import logging
import urllib3
import requests
from pathlib import Path
from typing import Optional, List, Dict, Any

# ── Silence SSL warnings (parliament.go.ke uses self-signed on some routes)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Environment ──────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
except ImportError:
    pass

# ── Supabase ─────────────────────────────────────────────────────────────────
try:
    from supabase import create_client, Client
    SUPABASE_OK = True
except ImportError:
    SUPABASE_OK = False

# ── OCR Providers ─────────────────────────────────────────────────────────────
try:
    import pytesseract
    from PIL import Image, ImageFilter, ImageOps
    from pdf2image import convert_from_bytes
    TESSERACT_OK = True
    _TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_TESSERACT):
        pytesseract.pytesseract.tesseract_cmd = _TESSERACT
except ImportError:
    TESSERACT_OK = False

try:
    from google.cloud import vision as gcloud_vision
    GVISION_OK = True
except ImportError:
    GVISION_OK = False

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [OCR-WORKER] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("ocr_worker.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# =============================================================================
#  Proxy helpers (mirrors stage_detector pattern — same env vars)
# =============================================================================

def _webshare_proxy_dict() -> Optional[Dict[str, str]]:
    raw = os.getenv("WEBSHARE_PROXIES", "")
    entries = [e.strip() for e in raw.split(",") if e.strip()]
    if not entries:
        return None
    entry = random.choice(entries)
    parts = entry.split(":")
    if len(parts) == 4:
        host, port, user, password = parts
        url = f"http://{user}:{password}@{host}:{port}"
    elif len(parts) == 2:
        url = f"http://{parts[0]}:{parts[1]}"
    else:
        return None
    return {"http": url, "https": url}


def _download_pdf(pdf_url: str, timeout: int = 45) -> Optional[bytes]:
    """
    Download a PDF through a tiered proxy chain.
    Tier 1: Webshare rotating residential
    Tier 2: ScraperAPI passthrough
    Tier 3: Naked (last resort)
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/pdf,*/*",
    }

    # Tier 1: Webshare
    proxies = _webshare_proxy_dict()
    if proxies:
        try:
            r = requests.get(pdf_url, headers=headers, proxies=proxies, timeout=timeout, verify=False)
            if r.status_code == 200 and r.content:
                logger.info(f"    [PDF DL Tier 1 ✅] Webshare: {len(r.content):,} bytes")
                return r.content
        except Exception as e:
            logger.warning(f"    [PDF DL Tier 1 ❌] {e}")

    # Tier 2: ScraperAPI
    sapi_key = os.getenv("SCRAPERAPI_KEY") or os.getenv("SCRAPERAPI_API_KEY")
    if sapi_key:
        try:
            scraper_url = (
                f"http://api.scraperapi.com"
                f"?api_key={sapi_key}"
                f"&url={requests.utils.quote(pdf_url, safe='')}"
                f"&country_code=ke"
            )
            r = requests.get(scraper_url, headers=headers, timeout=60, verify=False)
            if r.status_code == 200 and r.content:
                logger.info(f"    [PDF DL Tier 2 ✅] ScraperAPI: {len(r.content):,} bytes")
                return r.content
        except Exception as e:
            logger.warning(f"    [PDF DL Tier 2 ❌] {e}")

    # Tier 3: Naked
    try:
        r = requests.get(pdf_url, headers=headers, timeout=timeout, verify=False)
        if r.status_code == 200 and r.content:
            logger.info(f"    [PDF DL Tier 3 ✅] Naked: {len(r.content):,} bytes")
            return r.content
    except Exception as e:
        logger.warning(f"    [PDF DL Tier 3 ❌] {e}")

    return None


# =============================================================================
#  OCR Tier Chain
# =============================================================================

def _ocr_ocrspace(pdf_bytes: bytes) -> Optional[str]:
    """Tier A: OCR.space cloud API (first 5 pages only)."""
    api_key = os.getenv("OCR_SPACE_API_KEY")
    if not api_key:
        return None
    try:
        response = requests.post(
            "https://api.ocr.space/parse/image",
            files={"file": ("bill.pdf", pdf_bytes, "application/pdf")},
            data={
                "apikey": api_key,
                "language": "eng",
                "isOverlayRequired": False,
                "filetype": "PDF",
                "isCreateSearchablePdf": False,
                "isSearchablePdfHideTextLayer": False,
                "scale": True,
                "OCREngine": 2,
            },
            timeout=120,
        )
        result = response.json()
        if result.get("IsErroredOnProcessing"):
            logger.warning(f"    [OCR.space ❌] {result.get('ErrorMessage', 'Unknown error')}")
            return None
        pages = result.get("ParsedResults", [])
        text = "\n".join(p.get("ParsedText", "") for p in pages).strip()
        if text and len(text) > 100:
            logger.info(f"    [OCR.space ✅] {len(text):,} chars extracted.")
            return text
    except Exception as e:
        logger.warning(f"    [OCR.space ❌] {e}")
    return None


def _ocr_google_vision(pdf_bytes: bytes) -> Optional[str]:
    """Tier B: Google Cloud Vision API (handles noisy scans, low-contrast docs)."""
    if not GVISION_OK:
        return None
    try:
        client = gcloud_vision.ImageAnnotatorClient()
        # Convert first 10 pages to images for Vision API
        pages = convert_from_bytes(pdf_bytes, dpi=200, first_page=1, last_page=10)
        extracted_texts = []
        for page_img in pages:
            buf = io.BytesIO()
            page_img.save(buf, format="PNG")
            image = gcloud_vision.Image(content=buf.getvalue())
            response = client.text_detection(image=image)
            if response.text_annotations:
                extracted_texts.append(response.text_annotations[0].description)
        text = "\n".join(extracted_texts).strip()
        if text and len(text) > 100:
            logger.info(f"    [Google Vision ✅] {len(text):,} chars extracted.")
            return text
    except Exception as e:
        logger.warning(f"    [Google Vision ❌] {e}")
    return None


def _preprocess_image_for_tesseract(img: "Image.Image") -> "Image.Image":
    """
    Apply preprocessing to improve Tesseract accuracy on noisy government scans:
    - Convert to greyscale
    - Binarize (Otsu threshold via point())
    - Sharpen edges
    """
    img = img.convert("L")  # Greyscale
    img = img.point(lambda x: 0 if x < 140 else 255, "1")  # Binarize
    img = img.convert("RGB")
    img = img.filter(ImageFilter.SHARPEN)
    return img


def _ocr_tesseract_parallel(pdf_bytes: bytes) -> Optional[str]:
    """
    Tier C: Local Tesseract with preprocessing.
    Converts PDF pages to images, preprocesses each, and OCRs them.
    Page-level processing allows partial results even if some pages fail.
    """
    if not TESSERACT_OK:
        return None
    try:
        logger.info("    [Tesseract] Converting PDF pages to images...")
        pages = convert_from_bytes(pdf_bytes, dpi=250)
        extracted = []
        for i, page_img in enumerate(pages):
            try:
                preprocessed = _preprocess_image_for_tesseract(page_img)
                text = pytesseract.image_to_string(preprocessed, lang="eng", config="--psm 6")
                extracted.append(text)
                logger.info(f"    [Tesseract] Page {i + 1}/{len(pages)}: {len(text)} chars")
            except Exception as page_err:
                logger.warning(f"    [Tesseract] Page {i + 1} failed: {page_err}")
        full_text = "\n".join(extracted).strip()
        if full_text and len(full_text) > 50:
            logger.info(f"    [Tesseract ✅] {len(full_text):,} chars total extracted.")
            return full_text
    except Exception as e:
        logger.warning(f"    [Tesseract ❌] {e}")
    return None


def run_ocr_tiered(pdf_bytes: bytes) -> Optional[str]:
    """
    Run OCR through the full provider tier chain.
    Returns the first successful extraction of meaningful length.
    """
    # Tier A: OCR.space (cloud, fast)
    text = _ocr_ocrspace(pdf_bytes)
    if text:
        return text

    # Tier B: Google Vision (cloud, superior quality)
    text = _ocr_google_vision(pdf_bytes)
    if text:
        return text

    # Tier C: Local Tesseract with preprocessing (slowest, always available)
    text = _ocr_tesseract_parallel(pdf_bytes)
    if text:
        return text

    return None


# =============================================================================
#  Main Worker Loop
# =============================================================================

class OCRWorker:
    def __init__(self):
        self.supabase: Optional[Any] = None
        if SUPABASE_OK:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self.supabase = create_client(url, key)
                logger.info("Supabase client initialised.")

    def get_pending_bills(self) -> List[Dict[str, Any]]:
        """
        Fetch bills flagged for heavy OCR processing.
        A bill is eligible if requires_heavy_ocr = true OR text_content is NULL/very short.
        """
        if not self.supabase:
            return []
        try:
            # Primary: explicitly flagged by the corroborator
            flagged = self.supabase.table("bills").select(
                "id, title, pdf_url, text_content"
            ).eq("requires_heavy_ocr", True).execute()
            results = flagged.data or []

            # Secondary: bills with no usable text at all (safety net)
            no_text = self.supabase.table("bills").select(
                "id, title, pdf_url, text_content"
            ).is_("text_content", "null").not_.is_("pdf_url", "null").execute()

            # Merge, deduplicate by id
            seen_ids = {b["id"] for b in results}
            for b in (no_text.data or []):
                if b["id"] not in seen_ids:
                    results.append(b)
                    seen_ids.add(b["id"])

            logger.info(f"Found {len(results)} bill(s) pending OCR processing.")
            return results
        except Exception as e:
            logger.error(f"Failed to fetch pending bills: {e}")
            return []

    def commit_text(self, bill_id: str, text: str) -> bool:
        """Write extracted text back to the bill row and clear the OCR flag."""
        if not self.supabase:
            return False
        try:
            self.supabase.table("bills").update({
                "text_content": text,
                "requires_heavy_ocr": False,
            }).eq("id", bill_id).execute()
            logger.info(f"  ✅ Committed {len(text):,} chars to bill {bill_id}")
            return True
        except Exception as e:
            logger.error(f"  Failed to commit text for bill {bill_id}: {e}")
            return False

    def run(self):
        bills = self.get_pending_bills()
        if not bills:
            logger.info("No bills pending OCR. Worker exiting.")
            return

        processed = 0
        failed = 0

        for bill in bills:
            bill_id = bill["id"]
            title = bill.get("title", "Unknown")
            pdf_url = bill.get("pdf_url") or ""

            logger.info(f"\n{'─' * 60}")
            logger.info(f"Processing: {title}")
            logger.info(f"PDF URL: {pdf_url}")

            if not pdf_url:
                logger.warning(f"  No PDF URL for bill {bill_id} — skipping.")
                failed += 1
                continue

            pdf_bytes = _download_pdf(pdf_url)
            if not pdf_bytes:
                logger.warning(f"  Could not download PDF for bill {bill_id} — skipping.")
                failed += 1
                continue

            text = run_ocr_tiered(pdf_bytes)
            if not text:
                logger.warning(f"  All OCR tiers exhausted for bill {bill_id}.")
                failed += 1
                continue

            if self.commit_text(bill_id, text):
                processed += 1
            else:
                failed += 1

            # Polite delay between bills to avoid hammering OCR quotas
            time.sleep(random.uniform(2.0, 5.0))

        logger.info(f"\n{'=' * 60}")
        logger.info(f"OCR Worker complete: {processed} processed, {failed} failed.")


if __name__ == "__main__":
    worker = OCRWorker()
    worker.run()
