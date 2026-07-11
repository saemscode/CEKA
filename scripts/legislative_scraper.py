import os
import sys
import time
import json
import logging
import re
import io
import threading
import base64
import random
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urljoin, unquote, urlparse
from pathlib import Path

# ---------------------------------------------------------------------------
# B2 Vault Integration
# ---------------------------------------------------------------------------
try:
    from backblaze_utils import CloudVault
    B2_OK = True
except ImportError:
    B2_OK = False
    logging.getLogger(__name__).warning("backblaze_utils not importable – B2 upload disabled.")

# ---------------------------------------------------------------------------
# Stage Detector Integration
# ---------------------------------------------------------------------------
try:
    from stage_detector import detect_stage_from_text, extract_date_from_order_paper, normalize_stage_label
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
# Playwright Stealth (optional)
# ---------------------------------------------------------------------------
try:
    from playwright_stealth import stealth_sync
    STEALTH_OK = True
except ImportError:
    STEALTH_OK = False
    logging.getLogger(__name__).warning("playwright-stealth not installed – Cloudflare risk elevated.")

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
import numpy as np
class RemoteOCREngine:
    """
    Production-grade remote OCR engine with cascading provider fallback.

    Provider chain:
      1. PaddleOCR API (State of the art Vision-Language Model)
      2. Surya API (High accuracy backup)
      3. Gemini Vision (Multimodal Fallback)
      4. OCR.space (Legacy fallback)
      5. Cloudmersive (Legacy fallback)
      6. EasyOCR (Local unkillable fallback)
    """

    PADDLE_JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
    PADDLE_MODEL = "PaddleOCR-VL-1.6"
    SURYA_ENDPOINT = "https://www.datalab.to/api/v1/ocr"
    OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image"
    CLOUDMERSIVE_ENDPOINT = "https://api.cloudmersive.com/ocr/pdf/toText"

    # Free-tier limits
    OCR_SPACE_DAILY_LIMIT = 500
    MAX_CONCURRENT_FREE = 2
    MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024

    def __init__(self):
        self.paddle_token = os.environ.get("PADDLEOCR_TOKEN", "")
        self.gemini_key = os.environ.get("CEKA_GEMINI_API_KEY", "")
        self.surya_key = os.environ.get("SURYA_API_KEY", "")
        self.ocr_space_key = os.environ.get("OCR_SPACE_API_KEY", "")
        self.cloudmersive_key = os.environ.get("CLOUDMERSIVE_API_KEY", "")

        self._daily_counter_lock = threading.Lock()
        self._daily_counter = 0
        self._daily_counter_date = datetime.now(timezone.utc).date()
        self._ocr_space_semaphore = threading.Semaphore(self.MAX_CONCURRENT_FREE)

        self.metrics = {
            "paddle_requests": 0, "paddle_failed": 0,
            "surya_requests": 0, "surya_failed": 0,
            "gemini_requests": 0, "gemini_failed": 0,
            "ocr_requests_total": 0, "ocr_requests_failed": 0, "ocr_requests_quota_exhausted": 0,
            "ocr_cloudmersive_total": 0, "ocr_cloudmersive_failed": 0,
            "easyocr_requests": 0, "easyocr_failed": 0,
            "total_processing_time_ms": 0,
        }
        self._audit_log = []
        self._easyocr_reader = None

    def _is_quota_exhausted(self) -> bool:
        with self._daily_counter_lock:
            if datetime.now(timezone.utc).date() > self._daily_counter_date:
                self._daily_counter = 0
                self._daily_counter_date = datetime.now(timezone.utc).date()
            return self._daily_counter >= self.OCR_SPACE_DAILY_LIMIT

    def _increment_daily_counter(self):
        with self._daily_counter_lock:
            self._daily_counter += 1

    def ocr_fallback(self, pdf_bytes: bytes, pdf_url: str = "", title: str = "") -> Dict[str, Any]:
        start_time = time.time()
        result = {"text": "", "source": "none", "engine": None, "pages": [], "confidence_estimate": None, "notes": "", "metadata": {}}

        file_size = len(pdf_bytes)
        if file_size == 0:
            result["notes"] = "Empty PDF bytes provided."
            return result

        def _handle_res(res):
            if res and res.get("text"):
                elapsed_ms = int((time.time() - start_time) * 1000)
                self.metrics["total_processing_time_ms"] += elapsed_ms
                result.update(res)
                result["metadata"]["processing_time_ms"] = elapsed_ms
                return result
            return None

        # 1. PaddleOCR
        if self.paddle_token:
            r = _handle_res(self._try_paddle_ocr(pdf_bytes, pdf_url))
            if r: return r

        # 2. Surya
        if self.surya_key:
            r = _handle_res(self._try_surya_ocr(pdf_bytes, pdf_url))
            if r: return r

        # 3. Gemini Vision
        if self.gemini_key:
            r = _handle_res(self._try_gemini_vision_ocr(pdf_bytes))
            if r: return r

        # 4. OCR.space
        if self.ocr_space_key and file_size <= self.MAX_FILE_SIZE_BYTES:
            r = _handle_res(self._try_ocr_space(pdf_bytes))
            if r: return r

        # 4. Cloudmersive
        if self.cloudmersive_key:
            r = _handle_res(self._try_cloudmersive(pdf_bytes))
            if r: return r

        # 5. EasyOCR
        r = _handle_res(self._try_easy_ocr(pdf_bytes))
        if r: return r

        elapsed_ms = int((time.time() - start_time) * 1000)
        self.metrics["total_processing_time_ms"] += elapsed_ms
        result["notes"] = "All OCR providers failed."
        result["metadata"]["processing_time_ms"] = elapsed_ms
        return result

    def _try_paddle_ocr(self, pdf_bytes: bytes, pdf_url: str) -> Optional[Dict[str, Any]]:
        logger.info("      [PaddleOCR] Attempting PaddleOCR-VL-1.6...")
        self.metrics["paddle_requests"] += 1
        headers = {"Authorization": f"bearer {self.paddle_token}"}
        optional_payload = {"useDocOrientationClassify": False, "useDocUnwarping": False, "useChartRecognition": False}
        try:
            if pdf_url and pdf_url.startswith("http"):
                headers["Content-Type"] = "application/json"
                payload = {"fileUrl": pdf_url, "model": self.PADDLE_MODEL, "optionalPayload": optional_payload}
                resp = requests.post(self.PADDLE_JOB_URL, json=payload, headers=headers, timeout=30)
            else:
                data = {"model": self.PADDLE_MODEL, "optionalPayload": json.dumps(optional_payload)}
                files = {"file": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
                resp = requests.post(self.PADDLE_JOB_URL, headers=headers, data=data, files=files, timeout=30)
            if resp.status_code != 200:
                self.metrics["paddle_failed"] += 1
                return None
            job_id = resp.json().get("data", {}).get("jobId")
            if not job_id: return None
            poll_attempts = 0
            jsonl_url = ""
            while poll_attempts < 60:
                poll_resp = requests.get(f"{self.PADDLE_JOB_URL}/{job_id}", headers=headers, timeout=20)
                if poll_resp.status_code == 200:
                    state = poll_resp.json().get("data", {}).get("state")
                    if state == "done":
                        jsonl_url = poll_resp.json().get("data", {}).get("resultUrl", {}).get("jsonUrl")
                        break
                    elif state == "failed":
                        self.metrics["paddle_failed"] += 1
                        return None
                time.sleep(5)
                poll_attempts += 1
            if not jsonl_url:
                self.metrics["paddle_failed"] += 1
                return None
            res_jsonl = requests.get(jsonl_url, timeout=30)
            res_jsonl.raise_for_status()
            lines = res_jsonl.text.strip().split('\n')
            combined_md, pages_processed = [], []
            for i, line in enumerate(lines, start=1):
                if not line.strip(): continue
                try:
                    data_row = json.loads(line)
                    results = data_row.get("result", {}).get("layoutParsingResults", [])
                    for p in results:
                        text = p.get("markdown", {}).get("text", "")
                        if text: combined_md.append(text)
                    pages_processed.append(i)
                except: continue
            return {"text": "\n\n".join(combined_md), "source": "paddleocr", "engine": "VL-1.6", "pages": pages_processed, "confidence_estimate": 0.95, "notes": "PaddleOCR extraction successful."}
        except:
            self.metrics["paddle_failed"] += 1
            return None

    def _try_surya_ocr(self, pdf_bytes: bytes, pdf_url: str) -> Optional[Dict[str, Any]]:
        logger.info("      [Surya] Attempting Surya backup...")
        self.metrics["surya_requests"] += 1
        headers = {"Authorization": f"Bearer {self.surya_key}", "x-api-key": self.surya_key}
        try:
            files = {"file": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
            resp = requests.post(self.SURYA_ENDPOINT, headers=headers, files=files, timeout=60)
            if resp.status_code == 200:
                text = resp.json().get("text", "")
                if text: return {"text": text, "source": "surya", "engine": "v1", "pages": [], "confidence_estimate": 0.90, "notes": "Surya extraction successful."}
            self.metrics["surya_failed"] += 1
            return None
        except:
            self.metrics["surya_failed"] += 1
            return None

    def _try_gemini_vision_ocr(self, pdf_bytes: bytes) -> Optional[Dict[str, Any]]:
        logger.info("      [Gemini] Attempting Gemini Vision Multimodal OCR...")
        self.metrics["gemini_requests"] += 1
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)
            
            images = convert_from_bytes(pdf_bytes, dpi=200, fmt="jpeg")
            pages = []
            
            # Use gemini-2.0-flash
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            contents = ["Extract all text from these document pages exactly as written. Preserve all tables, headers, and structure in markdown format. Output ONLY the extracted text, no conversational filler."]
            for i, img in enumerate(images[:5]):
                contents.append(img)
                pages.append(i + 1)
                
            response = model.generate_content(contents)
            text = response.text
            
            if text and len(text) > 50:
                logger.info(f"      [Gemini] Success! Extracted {len(text)} chars from {len(pages)} pages.")
                return {
                    "text": text.strip(),
                    "source": "gemini_vision",
                    "engine": "gemini-2.0-flash",
                    "pages": pages,
                    "confidence_estimate": 0.95,
                    "notes": "Gemini Vision extraction successful."
                }
            
            self.metrics["gemini_failed"] += 1
            return None
        except Exception as e:
            logger.warning(f"      [Gemini] Exception: {e}")
            self.metrics["gemini_failed"] += 1
            return None

    def _try_ocr_space(self, pdf_bytes: bytes) -> Optional[Dict[str, Any]]:
        if self._is_quota_exhausted():
            self.metrics["ocr_requests_quota_exhausted"] += 1
            return None
        logger.info("      [OCR.space] Attempting Engine 2...")
        self.metrics["ocr_requests_total"] += 1
        with self._ocr_space_semaphore:
            try:
                b64_data = base64.b64encode(pdf_bytes).decode('utf-8')
                b64_string = f"data:application/pdf;base64,{b64_data}"
                response = requests.post(
                    self.OCR_SPACE_ENDPOINT,
                    headers={"apikey": self.ocr_space_key},
                    data={"base64Image": b64_string, "language": "eng", "isOverlayRequired": "false", "scale": "true", "OCREngine": "2"},
                    timeout=120, verify=False
                )
                self._increment_daily_counter()
                rj = response.json()
                if not rj.get("IsErroredOnProcessing", True):
                    all_text, pages = [], []
                    for pr in rj.get("ParsedResults", []):
                        pt = pr.get("ParsedText", "")
                        if pt.strip(): all_text.append(pt); pages.append(1)
                    final = "\n".join(all_text)
                    if len(final) > 200:
                        return {"text": final, "source": "ocr.space", "engine": 2, "pages": pages, "confidence_estimate": 0.85, "notes": ""}
                self.metrics["ocr_requests_failed"] += 1
                return None
            except:
                self.metrics["ocr_requests_failed"] += 1
                return None

    def _try_cloudmersive(self, pdf_bytes: bytes) -> Optional[Dict[str, Any]]:
        logger.info("      [Cloudmersive] Attempting Cloudmersive fallback...")
        self.metrics["ocr_cloudmersive_total"] += 1
        try:
            response = requests.post(
                self.CLOUDMERSIVE_ENDPOINT,
                headers={"Apikey": self.cloudmersive_key},
                files={"inputFile": ("document.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
                timeout=180
            )
            if response.status_code == 200:
                rj = response.json()
                if rj.get("Successful"):
                    return {"text": rj.get("TextResult", ""), "source": "cloudmersive", "engine": "default", "pages": [], "confidence_estimate": 0.90, "notes": ""}
            self.metrics["ocr_cloudmersive_failed"] += 1
            return None
        except:
            self.metrics["ocr_cloudmersive_failed"] += 1
            return None

    def _try_easy_ocr(self, pdf_bytes: bytes) -> Optional[Dict[str, Any]]:
        logger.info("      [EasyOCR] Attempting Local EasyOCR fallback...")
        self.metrics["easyocr_requests"] += 1
        try: import easyocr
        except: self.metrics["easyocr_failed"] += 1; return None
        try:
            if not self._easyocr_reader:
                self._easyocr_reader = easyocr.Reader(['en'], gpu=False)
            images = convert_from_bytes(pdf_bytes, dpi=200, fmt="jpeg")
            all_text, pages = [], []
            for i, img in enumerate(images[:5]):
                res = self._easyocr_reader.readtext(np.array(img), detail=0)
                if res: all_text.append(" ".join(res)); pages.append(i + 1)
            final_text = "\n".join(all_text)
            return {"text": final_text, "source": "easyocr", "engine": "local_cpu", "pages": pages, "confidence_estimate": 0.85, "notes": f"Local EasyOCR extracted from {len(pages)} pages."}
        except:
            self.metrics["easyocr_failed"] += 1
            return None

    def get_metrics(self) -> Dict[str, Any]:
        return {**self.metrics, "daily_requests_used": self._daily_counter, "daily_requests_remaining": max(0, self.OCR_SPACE_DAILY_LIMIT - self._daily_counter)}


class ProxyPool:
    def __init__(self):
        self.proxies = []
        self.usage_counts = self._load_usage_counts()
        self.health_status = {}
        self.lock = threading.Lock()
        self.last_webshare_refresh = 0.0
        self._load_proxies()
        
    def _load_proxies(self):
        # Bright Data
        bright_url = os.getenv("BRIGHTDATA_PROXY_URL")
        if bright_url:
            self.proxies.append({
                "url": bright_url,
                "type": "brightdata",
                "priority": 1,
                "limit": int(os.getenv("BRIGHTDATA_MONTHLY_LIMIT", 5000))
            })
        
        # ScraperAPI
        scraper_key = os.getenv("SCRAPERAPI_KEY")
        if scraper_key:
            bonus = int(os.getenv("SCRAPERAPI_FIRST_MONTH_BONUS", 5000))
            limit = int(os.getenv("SCRAPERAPI_MONTHLY_LIMIT", 1000)) + bonus
            self.proxies.append({
                "type": "scraperapi",
                "api_key": scraper_key,
                "priority": 2,
                "limit": limit
            })
        
        # Webshare static list
        webshare_list = os.getenv("WEBSHARE_PROXIES", "")
        for item in webshare_list.split(","):
            if ":" in item:
                parts = item.split(":")
                if len(parts) == 4:
                    ip, port, user, pwd = parts
                    proxy_url = f"http://{user}:{pwd}@{ip}:{port}"
                    self.proxies.append({
                        "url": proxy_url,
                        "type": "webshare",
                        "priority": 3,
                        "limit": None
                    })
        
        random.shuffle(self.proxies)
        self._initial_health_check()
    
    def _initial_health_check(self):
        for proxy in self.proxies:
            if "url" in proxy:
                self._test_proxy(proxy["url"])
        self.proxies.sort(key=lambda p: (
            p.get("priority", 99),
            0 if self.health_status.get(p.get("url", ""), {}).get("healthy", False) else 1
        ))
    
    def _test_proxy(self, proxy_url):
        test_url = os.getenv("PROXY_HEALTH_CHECK_URL", "https://api.ipify.org")
        timeout = int(os.getenv("PROXY_HEALTH_TIMEOUT", 10))
        try:
            proxies = {"http": proxy_url, "https": proxy_url}
            start = time.time()
            r = requests.get(test_url, proxies=proxies, timeout=timeout, verify=False)
            elapsed = time.time() - start
            if r.status_code == 200:
                self.health_status[proxy_url] = {"healthy": True, "latency": elapsed, "last_check": time.time()}
                return True
        except Exception:
            pass
        self.health_status[proxy_url] = {"healthy": False, "last_check": time.time()}
        return False
    
    def refresh_webshare_proxies(self):
        refresh_url = os.getenv("WEBSHARE_REFRESH_URL")
        interval_hours = int(os.getenv("WEBSHARE_REFRESH_INTERVAL_HOURS", 24))
        now = time.time()
        if refresh_url and (now - self.last_webshare_refresh > interval_hours * 3600):
            try:
                r = requests.get(refresh_url, timeout=30, verify=False)   # SSL fix
                if r.status_code == 200:
                    new_list = r.text.strip().split("\n")
                    new_proxies = []
                    for line in new_list:
                        parts = line.split(":")
                        if len(parts) >= 4:
                            ip, port, user, pwd = parts[0], parts[1], parts[2], parts[3]
                            proxy_url = f"http://{user}:{pwd}@{ip}:{port}"
                            new_proxies.append({
                                "url": proxy_url,
                                "type": "webshare",
                                "priority": 3
                            })
                    with self.lock:
                        self.proxies = [p for p in self.proxies if p.get("type") != "webshare"]
                        self.proxies.extend(new_proxies)
                    self.last_webshare_refresh = now
                    logger.info(f"Refreshed Webshare proxies: {len(new_proxies)}")
            except Exception as e:
                logger.warning(f"Webshare refresh failed: {e}")
    
    def get_proxy(self):
        self.refresh_webshare_proxies()
        
        available = []
        for p in self.proxies:
            limit = p.get("limit")
            used = self.usage_counts.get(p.get("type"), 0)
            if limit is None or used < limit:
                available.append(p)
        
        for p in available:
            if "url" in p:
                if not self.health_status.get(p["url"], {}).get("healthy", False):
                    if not self._test_proxy(p["url"]):
                        p["skip"] = True
        
        available = [p for p in available if not p.get("skip")]
        if not available:
            logger.error("No healthy proxies with remaining quota!")
            return None
        
        best = min(available, key=lambda p: p.get("priority", 99))
        if best.get("limit") is not None:
            self.usage_counts[best["type"]] = self.usage_counts.get(best["type"], 0) + 1
        return best
    
    def report_failure(self, proxy):
        if proxy and "url" in proxy:
            self.health_status[proxy["url"]] = {"healthy": False, "last_check": time.time()}
            proxy["priority"] = 999

    def _load_usage_counts(self) -> Dict[str, Any]:
        try:
            fpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "proxy_usage.json")
            if os.path.exists(fpath):
                with open(fpath, "r") as f:
                    data = json.load(f)
                    last_reset = data.get("last_reset_month", "")
                    curr_month = datetime.now().strftime("%Y-%m")
                    if last_reset != curr_month:
                        return {"last_reset_month": curr_month}
                    return data
        except Exception:
            pass
        return {"last_reset_month": datetime.now().strftime("%Y-%m")}

    def save_usage_counts(self):
        try:
            fpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "proxy_usage.json")
            with open(fpath, "w") as f:
                json.dump(self.usage_counts, f)
        except Exception:
            pass


# ===================================================================
#  BillStructuralExtractor  –  Structural Breadcrumb Engine
# ===================================================================
class BillStructuralExtractor:
    ANCHOR_MEMORANDUM = "MEMORANDUM OF OBJECTS AND REASONS"
    ANCHOR_ARTICLE_114 = "Article 114 of the Constitution"
    ANCHOR_COUNTY_GOVTS = "concerns County Governments"
    ANCHOR_ENACTED = "ENACTED by the Parliament of Kenya"
    ANCHOR_REFERENCE = "which it is proposed to amend"

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
            toc = doc.get_toc()  # type: ignore
            memo_page = -1
            if toc:
                result["has_toc"] = True
                for entry in toc:
                    if "MEMORANDUM" in entry[1].upper():
                        memo_page = entry[2] - 1
                        result["structural_method"] = "native_toc"
                        break

            if memo_page == -1:
                for i in range(len(doc)):
                    page_text = doc[i].get_text()
                    if BillStructuralExtractor.ANCHOR_MEMORANDUM in page_text:
                        memo_page = i
                        result["structural_method"] = "skeleton_scan"
                        break
            
            if memo_page != -1:
                end_page = min(memo_page + 2, len(doc))
                memo_text = ""
                for i in range(memo_page, end_page):
                    memo_text += doc[i].get_text()

                if BillStructuralExtractor.ANCHOR_ARTICLE_114 in memo_text:
                    m = BillStructuralExtractor.MONEY_BILL_PATTERNS[0].search(memo_text)
                    nm = BillStructuralExtractor.MONEY_BILL_PATTERNS[1].search(memo_text)
                    if nm:
                        result["is_money_bill"] = False
                    elif m:
                        result["is_money_bill"] = True

                if BillStructuralExtractor.ANCHOR_COUNTY_GOVTS in memo_text:
                    m = BillStructuralExtractor.COUNTY_GOVT_PATTERNS[0].search(memo_text)
                    nm = BillStructuralExtractor.COUNTY_GOVT_PATTERNS[1].search(memo_text)
                    if nm:
                        result["concerns_counties"] = False
                    elif m:
                        result["concerns_counties"] = True

                date_match = None
                for pat in BillStructuralExtractor.DATE_PATTERNS:
                    date_match = pat.search(memo_text)
                    if date_match:
                        break
                
                if date_match:
                    result["date_signed"] = date_match.group(0)
                    after_date = memo_text[date_match.end():date_match.end()+500]
                    lines = [line.strip() for line in after_date.split('\n') if line.strip()]
                    for line in lines:
                        if line.isupper() and len(line) > 5:
                            result["sponsor_name"] = line
                            idx = lines.index(line)
                            if idx + 1 < len(lines):
                                result["sponsor_title"] = lines[idx+1]
                            break

            doc.close()
        except Exception as e:
            logger.warning(f"      [Structural] Extraction failed: {e}")

        return result


# ===================================================================
#  LegislativeScraper – with all fixes (Cloudflare, selectors, proxy pool, stealth)
# ===================================================================
class LegislativeScraper:
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
                self.b2_vault = CloudVault()
                logger.info("B2 Vault initialized for PDF mirroring.")
            except Exception as e:
                logger.warning(f"B2 Vault init failed (non-fatal): {e}")
        
        self.orchestrator = MultiLLMOrchestrator() if ORCHESTRATOR_OK else None
        self.proxy_pool = ProxyPool()
        if TESSERACT_OK:
            tess_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            if os.path.exists(tess_path):
                pytesseract.pytesseract.tesseract_cmd = tess_path

    # -------------------------------------------------------------------
    #  Helpers for Cloudflare and content validation
    # -------------------------------------------------------------------
    @staticmethod
    def _is_cloudflare_challenge(html: str) -> bool:
        cf_signatures = [
            "cf-browser-verification", "challenge-platform",
            "Checking if the site connection is secure",
            "Enable JavaScript and cookies to continue",
            "cf_clearance", "jschl-answer", "Just a moment",
            "DDoS protection by Cloudflare", "cloudflare-nginx",
            "attention required"
        ]
        lower = html.lower()
        return any(sig.lower() in lower for sig in cf_signatures)

    def _wait_for_real_content(self, page, timeout_ms: int = 15000) -> bool:
        """Wait until real content (a table with rows) appears, not a Cloudflare challenge."""
        deadline = time.time() + timeout_ms / 1000
        while time.time() < deadline:
            html = page.content()
            if self._is_cloudflare_challenge(html):
                logger.warning("  [CF] Challenge page detected. Waiting 3s for JS resolution...")
                time.sleep(3)
                continue
            # Look for a table that has at least one row or any PDF links
            has_content = page.evaluate("""() => {
                const table = document.querySelector('table');
                if (table && table.querySelectorAll('tr').length > 1) return true;
                return document.querySelectorAll('a[href$=".pdf"]').length > 0;
            }""")
            if has_content:
                return True
            time.sleep(1)
        # If no CF detected but still no content, assume real (empty) page
        html = page.content()
        if not self._is_cloudflare_challenge(html):
            return True
        logger.error("  [CF] Challenge page persisted — Cloudflare not bypassed.")
        return False

    @staticmethod
    def _normalise_title_key(raw: str) -> str:
        t = re.sub(r'\.(pdf|docx?|html?)$', '', raw, flags=re.I)
        t = re.sub(r'[^a-z0-9\s]', ' ', t.lower())
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    # -------------------------------------------------------------------
    #  Stealth browser builder (with optional proxy)
    # -------------------------------------------------------------------
    def _build_stealth_browser(self, playwright):
        launch_opts: Dict[str, Any] = {
            "headless": self.headless,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
                "--lang=en-US,en",
                "--ignore-certificate-errors",   # SSL fix
            ]
        }
        # Get proxy from pool if available
        proxy_info = self.proxy_pool.get_proxy()
        if proxy_info and "url" in proxy_info:
            parsed = urlparse(proxy_info["url"])
            launch_opts["proxy"] = {
                "server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}",
                "username": parsed.username,
                "password": parsed.password
            }
            logger.info(f"[Browser] Using proxy: {proxy_info['type']}")
        else:
            logger.info("[Browser] No proxy – direct connection.")

        browser = playwright.chromium.launch(**launch_opts)

        ctx_args = {
            "user_agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "viewport": {"width": 1366, "height": 768},
            "extra_http_headers": {
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            },
            "java_script_enabled": True,
            "bypass_csp": True,
            "ignore_https_errors": True,   # SSL fix
        }
        context = browser.new_context(**ctx_args)

        # Stealth init script (even if playwright-stealth not installed)
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
            Object.defineProperty(navigator, 'languages', {get: () => ['en-US','en']});
            window.chrome = {runtime: {}};
        """)
        logger.info("[Browser] Stealth init script injected.")
        return browser, context

    # -------------------------------------------------------------------
    #  _scrape_bills – FINAL FIXED VERSION (table extraction)
    # -------------------------------------------------------------------
    def _scrape_bills(self, page, target: dict, max_pages: int):
        base_url = target["url"].rstrip("/")
        if "?" in base_url:
            base_url = base_url.split("?")[0]

        prev_page_hash = None
        consecutive_empty = 0

        for page_num in range(max_pages):
            # Always include empty title= to satisfy Drupal Views
            page_url = f"{base_url}?title=&page={page_num}"
            logger.info(f"  Page {page_num + 1}: {page_url}")

            try:
                page.goto(page_url, wait_until="domcontentloaded", timeout=60000)

                # Cloudflare guard
                if not self._wait_for_real_content(page, timeout_ms=20000):
                    logger.error(f"  [CF] Cloudflare block on page {page_num + 1}. Skipping.")
                    consecutive_empty += 1
                    if consecutive_empty >= 2:
                        break
                    continue

                # Wait an extra second for any JS-lazy-loaded content
                page.wait_for_timeout(2000)

                # Simple, reliable extraction: find all rows in the main table
                rows = page.evaluate("""() => {
                    const allTables = document.querySelectorAll('table');
                    let allRows = [];
                    for (const table of allTables) {
                        // Only consider tables that have at least one PDF link
                        if (table.querySelectorAll('a[href$=".pdf"]').length === 0) continue;
                        const rows = table.querySelectorAll('tbody tr, tr');
                        for (const row of rows) {
                            const pdfLink = row.querySelector('a[href$=".pdf"]');
                            if (!pdfLink) continue;
                            allRows.push({
                                pdfHref: pdfLink.href,
                                pdfText: pdfLink.textContent.trim(),
                                detailHref: null,
                                rowText: row.innerText.trim().substring(0, 300)
                            });
                        }
                    }
                    return allRows;
                }""")

                if not rows or len(rows) == 0:
                    consecutive_empty += 1
                    logger.info(f"  [Cap] No bill rows on page {page_num + 1} (consecutive empty: {consecutive_empty}).")
                    if consecutive_empty >= 2:
                        break
                    continue

                consecutive_empty = 0
                logger.info(f"  Found {len(rows)} bill rows on page {page_num + 1}")

                for row in rows:
                    pdf_href = row.get("pdfHref", "")
                    pdf_text = row.get("pdfText", "")
                    detail_href = row.get("detailHref")

                    if not pdf_href:
                        continue

                    raw_title = pdf_text or self._title_from_url(pdf_href)
                    title = self._clean_title(raw_title)
                    if not title:
                        continue

                    slug_key = self._normalise_title_key(title)
                    if slug_key in self.seen_titles:
                        logger.debug(f"    [Dup] Skipping known: {title}")
                        continue
                    self.seen_titles.add(slug_key)

                    if not self._is_bill_document(title):
                        logger.info(f"    [SKIP] Non-bill document hard-discarded (strict mode): {title}")
                        continue

                    try:
                        record = self._deep_process_bill(page, title, pdf_href, detail_href, target)
                        self.data.append(record)
                        logger.info(f"    [BILL] {title}")
                    except Exception as e:
                        logger.error(f"    [BILL] Deep process failed for '{title}': {e}")
                        self.data.append({
                            "title": title,
                            "url": pdf_href,
                            "pdf_url": pdf_href,
                            "source": target["name"],
                            "status": "PUBLISHED",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "session_year": int(self._extract_year(title) or datetime.now().year),
                            "metadata": {
                                "scraped_at": datetime.now(timezone.utc).isoformat(),
                                "extraction_method": "fallback_minimal",
                                "error": str(e),
                            },
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })

                # Pagination check
                has_next = page.evaluate("""() => {
                    const next = document.querySelector('li.pager-next a, a[rel="next"], .pager__item--next a, li.next a');
                    return next !== null;
                }""")
                if not has_next:
                    logger.info(f"  [Cap] No next-page link after page {page_num + 1}. Pagination done.")
                    break

                time.sleep(0.5 + (page_num % 3) * 0.3)

            except Exception as e:
                logger.error(f"  Page {page_num + 1} error: {e}")
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    logger.error("  Three consecutive errors. Stopping pagination.")
                    break

    # -------------------------------------------------------------------
    #  scrape_all – uses stealth browser and proxy pool
    # -------------------------------------------------------------------
    def scrape_all(self, max_pages: int = 40) -> List[Dict[str, Any]]:
        self.tracker_enrichment: Dict[str, Any] = {"matched": [], "unmatched": [], "pdf_count": 0, "row_count": 0}
        logger.info("=" * 60)
        logger.info("  Legislative Sync Engine  (Stealth + CF-hardened + ProxyPool)")
        logger.info("=" * 60)

        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.error("Playwright not installed.")
            return []

        with sync_playwright() as p:
            browser, ctx = self._build_stealth_browser(p)
            page = ctx.new_page()

            # Apply playwright-stealth if available
            if STEALTH_OK:
                try:
                    stealth_sync(page)
                    logger.info("[Stealth] playwright-stealth applied to page.")
                except Exception as e:
                    logger.warning(f"[Stealth] stealth_sync failed (non-fatal): {e}")

            for target in self.targets:
                logger.info(f"\n>>> Syncing: {target['name']}")
                if target.get('type') != 'bills':
                    logger.info(f"  [SKIP] Target type '{target.get('type')}' is not 'bills' — skipped (strict mode).")
                    continue
                try:
                    self._scrape_bills(page, target, max_pages)
                except Exception as e:
                    logger.error(f"  Target failed: {e}")

            # --- Phase 2: Tracker Enrichment (runs after bills, same browser session) ---
            logger.info("\n" + "=" * 60)
            logger.info("  Bill Tracker Enrichment Phase")
            logger.info("=" * 60)
            self.tracker_enrichment = self._run_tracker_enrichment(page)

            browser.close()

        # Save proxy usage stats
        self.proxy_pool.save_usage_counts()

        # Log OCR metrics
        metrics = self.ocr_engine.get_metrics()
        logger.info("\n--- OCR Metrics ---")
        logger.info(f"  OCR.space requests: {metrics['ocr_requests_total']} (failed: {metrics['ocr_requests_failed']}, quota exhausted: {metrics['ocr_requests_quota_exhausted']})")
        logger.info(f"  Cloudmersive requests: {metrics['ocr_cloudmersive_total']} (failed: {metrics['ocr_cloudmersive_failed']})")
        logger.info(f"  Daily quota remaining: {metrics['daily_requests_remaining']}/{self.ocr_engine.OCR_SPACE_DAILY_LIMIT}")
        logger.info(f"  Total OCR processing time: {metrics['total_processing_time_ms']}ms")
        logger.info(f"\nSync complete – {len(self.data)} bills scraped")
        return self.data

    # -------------------------------------------------------------------
    #  Remaining methods
    #  - _load_targets, _deep_process_bill, _distill_bill_content,
    #    _ocr_page_screenshots, _scrape_bill_detail_page,
    #    _extract_text_cascade, _parse_bill_text, _scrape_standard_docs,
    #    _is_bill_document, _clean_title, _title_from_url, _extract_year,
    #    _extract_bill_no, _infer_status_from_text, _infer_category,
    #    _download_pdf, save_data
    # -------------------------------------------------------------------
    def _load_targets(self) -> list:
        try:
            with open(self.targets_file, 'r', encoding='utf-8') as f:
                return json.load(f).get("targets", [])
        except Exception as e:
            logger.error(f"Failed to load targets: {e}")
            return []

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
            is_scanned = True
        
        # 2. Secondary: Remote OCR Fallback on real PDF bytes
        if is_scanned and pdf_bytes:
            logger.info(f"      [OCR] Scanned PDF detected for: {title}")
            ocr_result = self.ocr_engine.ocr_fallback(pdf_bytes, pdf_url=pdf_url, title=title)
            if ocr_result["text"].strip():
                text = ocr_result["text"]
                method = f"remote_ocr:{ocr_result['source']}:engine_{ocr_result['engine']}"
                is_scanned = False
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

        # 3. Screenshot-based OCR
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

        # 4. HTML metadata fallback
        html_metadata = {}
        if is_scanned and detail_url:
            html_metadata = self._scrape_bill_detail_page(page, detail_url)
        
        # 5. Local Tesseract last resort
        if is_scanned and not text.strip() and pdf_bytes and TESSERACT_OK:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                if len(doc) > 0:
                    page0 = doc[0]
                    pix = page0.get_pixmap(matrix=fitz.Matrix(2, 2))
                    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    text = pytesseract.image_to_string(img)
                    if text.strip():
                        method = "local_tesseract"
                        is_scanned = False
                        logger.info(f"      [OCR] Local Tesseract SUCCESS: {len(text)} chars")
                doc.close()
            except Exception as e:
                logger.warning(f"      [OCR] Local Tesseract failed: {e}")

        # 6. Multi-LLM distillation
        intel = {}
        if text.strip() and self.orchestrator:
            logger.info(f"      [INTEL] Running Multi-LLM Distillation for: {title}")
            intel = self._distill_bill_content(text, title)
            if intel:
                logger.info(f"      [INTEL] Distillation SUCCESS for: {title}")

        # 7. Structural extraction
        structural_data = {}
        if pdf_bytes:
            logger.info(f"      [Structural] Running breadcrumb analysis for: {title}")
            structural_data = BillStructuralExtractor.extract_all(pdf_bytes, title)
            if structural_data.get("sponsor_name"):
                logger.info(f"      [Structural] Found Sponsor: {structural_data['sponsor_name']}")

        parsed_pdf = self._parse_bill_text(text) if text.strip() else {}
        
        sponsor = structural_data.get('sponsor_name') or intel.get('sponsor') or parsed_pdf.get('sponsor') or html_metadata.get('sponsor') or "Government"
        sponsor_title = structural_data.get('sponsor_title')
        status = intel.get('status') or html_metadata.get('status') or self._infer_status_from_text(text, title)
        
        has_bill_no = structural_data.get("bill_no") or self._extract_bill_no(text or title)
        is_draft_keywords = re.search(r'\b(DRAFT|PROPOSED\s+BILL|FOR\s+CONSULTATION)\b', (title + " " + (text or "")[:2000]).upper())
        if not has_bill_no or is_draft_keywords:
            logger.info(f"    ⚠️ Draft detected (Metadata: {bool(has_bill_no)}, Keywords: {bool(is_draft_keywords)}). Flagging PRE-PUBLICATION.")
            status = "PRE-PUBLICATION"

        if not status:
            status = "PUBLISHED" if target.get('type') == 'bills' else "Ingested"
        if STAGE_DETECTOR_OK:
            status = normalize_stage_label(status)

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

        real_date = parsed_pdf.get('date') or html_metadata.get('date')
        if not real_date and text.strip() and STAGE_DETECTOR_OK:
            real_date = extract_date_from_order_paper(text)
        if not real_date:
            real_date = datetime.now().strftime("%Y-%m-%d")

        # -----------------------------------------------------------------
        # FINAL DICTIONARY - REMOVED is_money_bill AND concerns_counties
        # because they are missing in the Supabase schema.
        # You can add them back after altering the table.
        # -----------------------------------------------------------------
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
            # "is_money_bill": structural_data.get("is_money_bill"),      # commented out – add column first
            # "concerns_counties": structural_data.get("concerns_counties"), # commented out – add column first
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
        if not self.orchestrator:
            return {}
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
        if not self.ocr_engine.ocr_space_key:
            return "", {}
        try:
            dp = page.context.new_page()
            dp.goto(url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(1)
            viewport_height = dp.viewport_size["height"]
            page_height = dp.evaluate("document.body.scrollHeight")
            max_screenshots = min(3, max(1, page_height // viewport_height + 1))
            all_text = []
            pages_processed = []
            for i in range(max_screenshots):
                scroll_y = i * viewport_height
                dp.evaluate(f"window.scrollTo(0, {scroll_y})")
                time.sleep(0.3)
                screenshot_bytes = dp.screenshot(type="png")
                if len(screenshot_bytes) > self.ocr_engine.MAX_FILE_SIZE_BYTES:
                    logger.warning(f"      [Screenshot OCR] Screenshot {i+1} exceeds 1MB, skipping.")
                    continue
                if self.ocr_engine._is_quota_exhausted():
                    logger.warning("      [Screenshot OCR] OCR.space daily quota exhausted.")
                    break
                try:
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
                        timeout=120,
                        verify=False   # SSL fix
                    )
                    self.ocr_engine._increment_daily_counter()
                    self.ocr_engine.metrics["ocr_requests_total"] += 1
                    rj = response.json()
                    if not rj.get("IsErroredOnProcessing", True):
                        for pr in rj.get("ParsedResults", []):
                            exit_code = pr.get("FileParseExitCode")
                            if isinstance(exit_code, str):
                                try:
                                    exit_code = int(exit_code)
                                except:
                                    exit_code = -1
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
        try:
            logger.info(f"      [Fallback] Scraped Detail Page: {url}")
            dp = page.context.new_page()
            dp.goto(url, wait_until="domcontentloaded", timeout=30000)
            data = dp.evaluate("""() => {
                const results = {};
                document.querySelectorAll('tr, .field').forEach(el => {
                    const text = el.innerText.toLowerCase();
                    if (text.includes('sponsor')) results.sponsor = el.innerText.split(':').pop().trim();
                    if (text.includes('status') || text.includes('stage')) results.status = el.innerText.split(':').pop().trim();
                    if (text.includes('date')) results.date = el.innerText.split(':').pop().trim();
                });
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
        if FITZ_OK:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                text = "\n".join(p.get_text() for p in doc)
                doc.close()
                if text.strip():
                    return text, "pymupdf"
            except:
                pass
        if PYPDF2_OK:
            try:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                text = "\n".join(p.extract_text() or "" for p in reader.pages)
                if text.strip():
                    return text, "pypdf2"
            except:
                pass
        if PDFPLUMBER_OK:
            try:
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                    if text.strip():
                        return text, "pdfplumber"
            except:
                pass
        return "", None

    def _parse_bill_text(self, text: str) -> dict:
        result = {}
        summary_patterns = [
            re.compile(r'MEMORANDUM\s+OF\s+OBJECTS\s+AND\s+REASONS(.*?)(?:$|Dated\s+the|\Z)', re.S | re.I),
            re.compile(r'OBJECTS\s+AND\s+REASONS(.*?)(?:$|Dated\s+the|\Z)', re.S | re.I),
            re.compile(r'OBJECTS\s+OF\s+THE\s+BILL(.*?)(?:PART\s+I|ENACTED|Dated|\Z)', re.S | re.I),
            re.compile(r'STATEMENT\s+OF\s+(?:THE\s+)?JUSTIFICATION(.*?)(?:$|Dated|\Z)', re.S | re.I),
            re.compile(r'PURPOSE\s+OF\s+THE\s+BILL(.*?)(?:PART\s+I|ENACTED|Dated|\Z)', re.S | re.I),
            re.compile(r'ARRANGEMENT\s+OF\s+CLAUSES(.*?)(?:A\s+Bill\s+for|PART\s+I|\Z)', re.S | re.I),
        ]
        for pat in summary_patterns:
            m = pat.search(text)
            if m:
                extracted = re.sub(r'\s+', ' ', m.group(1).strip())
                if len(extracted) > 30:
                    result['summary'] = extracted[:3000]
                    break
        desc_patterns = [
            re.compile(r'(A\s+Bill\s+for\s+AN\s+ACT\s+of\s+Parliament\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            re.compile(r'(AN\s+ACT\s+of\s+Parliament\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            re.compile(r'(An\s+Act\s+to.*?)(?:ENACTED|PART\s+I|BE\s+IT\s+ENACTED)', re.S | re.I),
            re.compile(r'Bill\s+No\.?\s*\d+.*?\n(.*?)(?:PART\s+I|ARRANGEMENT)', re.S | re.I),
        ]
        for pat in desc_patterns:
            m = pat.search(text)
            if m:
                extracted = re.sub(r'\s+', ' ', m.group(1).strip())
                if len(extracted) > 20:
                    result['description'] = extracted[:2000]
                    break
        sponsor = None
        header_text = text[:3000]
        header_patterns = [
            re.compile(r'Sponsored\s+by\s+(?:the\s+)?(?:Hon\.?\s+)?([\w\s,]+?)(?:\s*,\s*MP|\s*,\s*M\.?P\.?|\n|$)', re.I),
            re.compile(r'Presented\s+by\s+(?:the\s+)?(?:Hon\.?\s+)?([\w\s,]+?)(?:\s*,\s*MP|\s*,\s*M\.?P\.?|\n|$)', re.I),
            re.compile(r'Sponsor:\s+([\w\s,]+?)(?:\n|$)', re.I),
        ]
        for pat in header_patterns:
            m = pat.search(header_text)
            if m:
                extracted = m.group(1).strip()
                if 3 < len(extracted) < 150 and "means" not in extracted.lower():
                    sponsor = extracted
                    break
        if not sponsor:
            memo_match = re.search(r'MEMORANDUM\s+OF\s+OBJECTS\s+AND\s+REASONS', text, re.I)
            if memo_match:
                memo_idx = memo_match.start()
                memo_block = text[memo_idx : memo_idx + 3500]
                dated_match = re.search(r'Dated\s+the', memo_block, re.I)
                if dated_match:
                    signature_block = memo_block[dated_match.start():]
                    sig_pat = re.compile(r'Dated.*?202\d\.?\s*\n?\s*([\w\s,.]+?)\s*,\s*(?:Member\s+of\s+Parliament|Senator|Leader\s+of\s+the\s+Majority|Chairperson|Cabinet\s+Secretary)', re.S | re.I)
                    sm = sig_pat.search(signature_block)
                    if sm:
                        name = sm.group(1).strip()
                        name = re.sub(r'^(?:the\s+)?(?:Hon\.?\s+)', '', name, flags=re.I).strip()
                        context_after = signature_block[sm.end() : sm.end() + 100].lower()
                        is_interpretation = "means" in context_after and len(context_after.split("means")[0].split()) < 5
                        if 3 < len(name) < 100 and not is_interpretation:
                            sponsor = name
        if sponsor:
            result['sponsor'] = sponsor
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
        # TOMBSTONED (strict mode) — non-bill targets are blocked in scrape_all().
        # This method must never be reached. If it is, fail loudly.
        raise RuntimeError(
            f"[STRICT MODE] _scrape_standard_docs called for '{target.get('name')}' "
            f"(type='{target.get('type')}'). Only type='bills' targets are permitted. "
            "Remove this target from scraping_targets.json."
        )

    def _build_non_bill_record(self, title, url, target):
        # TOMBSTONED (strict mode) — non-bill records must never enter self.data.
        raise RuntimeError(
            f"[STRICT MODE] _build_non_bill_record called for '{title}'. "
            "All non-bill documents must be hard-discarded via 'continue' in _scrape_bills()."
        )

    _BILL_BLOCKLIST = (
        'hansard', 'order paper', 'questions',
        'notice of motion', 'petitions', 'committee report',
        'sessional paper', 'supplement', 'gazette notice',
        'speaker', 'adjournment',
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
        if not self._BILL_REQUIRED_PATTERN.search(t):
            return False
        for kw in self._BILL_BLOCKLIST:
            if kw in t:
                return False
        return True

    def _clean_title(self, raw: str) -> str:
        t = re.sub(r'\.(pdf|docx?|html?)$', '', raw, flags=re.I).strip()
        return re.sub(r'\s+', ' ', t)

    def _title_from_url(self, url: str) -> str:
        return unquote(url.split('/')[-1]).replace('.pdf', '')

    def _extract_year(self, text: str) -> Optional[str]:
        m = re.search(r'(202[2-9])', text)
        return m.group(0) if m else None

    def _extract_bill_no(self, text: str) -> str:
        m = re.search(r'(?:Senate|National\s+Assembly|NA|SENATE)\s*(?:Bills?)\s+No\.?\s*(\d+)', text, re.I)
        if not m:
            m = re.search(r'\bBills?\s+No\.?\s*(\d+)', text, re.I)
        return f"No. {m.group(1)}" if m else ""

    def _infer_status_from_text(self, text: str, title: str) -> str:
        t = (title.lower() + " " + text.lower())
        STAMP_DICT = {
            "ASSENT": [
                re.compile(r'PRESIDENTIAL\s+ASSENT\s+ON\s+(\d{1,2}\s+[A-Z]{3}\s+202[4-9])', re.I),
                re.compile(r'SIGNED\s+BY\s+THE\s+PRESIDENT', re.I),
                re.compile(r'ACT\s+NO\.\s+\d+\s+OF\s+202[4-9]', re.I)
            ],
            "PASSED": [
                re.compile(r'PASSED\s+WITH(?:OUT)?\s+AMENDMENTS\s+BY\s+THE\s+(?:NATIONAL ASSEMBLY\|SENATE)', re.I),
                re.compile(r'READ\s+A\s+THIRD\s+TIME\s+AND\s+PASSED', re.I)
            ],
            "FORWARDED": [
                re.compile(r'FORWARDED\s+TO\s+THE\s+(?:SENATE\|NATIONAL\s+ASSEMBLY)\s+FOR\s+CONCURRENCE', re.I)
            ],
            "3RD READING": [
                re.compile(r'(\d{1,2}\s+[A-Z]{3}\s+202[4-9])\s+THIRD\s+READING', re.I),
                re.compile(r'MOTION\s+FOR\s+THIRD\s+READING', re.I)
            ],
            "REPORT STAGE": [
                re.compile(r'REPORT\s+ON\s+THE\s+BILL\s+CONSIDERED\s+IN\s+COMMITTEE', re.I),
                re.compile(r'REPORT\s+OF\s+THE\s+COMMITTEE\s+OF\s+THE\s+WHOLE\s+HOUSE', re.I)
            ],
            "COMMITTEE STAGE": [
                re.compile(r'REPORTED\s+FROM\s+THE\s+COMMITTEE\s+OF\s+THE\s+WHOLE\s+HOUSE', re.I),
                re.compile(r'IN\s+THE\s+COMMITTEE', re.I)
            ],
            "SECOND READING": [
                re.compile(r'(\d{1,2}\s+[A-Z]{3}\s+202[4-9])\s+SECOND\s+READING', re.I),
                re.compile(r'MOTION\s+FOR\s+SECOND\s+READING', re.I)
            ],
            "COMMITTEE": [
                re.compile(r'Read\s+a\s+First\s+Time\s+and\s+referred\s+to\s+the\s+(?:Departmental\|Standing)?\s+Committee', re.I)
            ],
            "1ST READING": [
                re.compile(r'(\d{1,2}\s+[A-Z]{3}\s+202[4-9])\s+(?:THE\s+)?(?:SENATE|NATIONAL\s+ASSEMBLY)?\s+FIRST\s+READING', re.I)
            ],
            "PUBLISHED": [
                re.compile(r'Kenya\s+Gazette\s+Supplement\s+No\.', re.I),
                re.compile(r'Special\s+Issue', re.I)
            ],
            "NEGATIVED": [
                re.compile(r'THE\s+QUESTION\s+BE\s+NOW\s+PUT\s+WAS\s+NEGATIVED', re.I),
                re.compile(r'BILL\s+NEGATIVED', re.I)
            ],
            "WITHDRAWN": [
                re.compile(r'BILL\s+WITHDRAWN\s+BY\s+THE\s+MOVER', re.I),
                re.compile(r'BILL\s+DIES', re.I)
            ]
        }
        for stage, patterns in STAMP_DICT.items():
            for pat in patterns:
                if pat.search(text):
                    return stage
        if STAGE_DETECTOR_OK:
            detected = detect_stage_from_text(text, title)
            if detected:
                return normalize_stage_label(detected)
        if 'presidential assent' in t or 'signed into law' in t:
            return "ASSENT"
        if 'reading' in t:
            if 'third' in t:
                return "3RD READING"
            if 'second' in t:
                return "2ND READING"
            return "1ST READING"
        return "PUBLISHED"

    def _infer_category(self, title: str) -> str:
        return "All Portfolios"

    def _download_pdf(self, url: str, page=None) -> Optional[bytes]:
        pdf_bytes = None
        proxy = self.proxy_pool.get_proxy()

        if proxy and "url" in proxy and REQUESTS_OK:
            try:
                proxies = {"http": proxy["url"], "https": proxy["url"]}
                r = requests.get(url, timeout=30, allow_redirects=True, verify=False, proxies=proxies)
                if r.content[:5] == b"%PDF-":
                    logger.info(f"      [DL] PDF downloaded via proxy ({proxy['type']}): {len(r.content)} bytes")
                    return r.content
                else:
                    logger.info(f"      [DL] Proxy {proxy['type']} returned non-PDF content.")
                    self.proxy_pool.report_failure(proxy)
            except Exception as e:
                logger.warning(f"      [DL] Proxy {proxy['type']} failed: {e}")
                self.proxy_pool.report_failure(proxy)

        if proxy and proxy["type"] == "scraperapi":
            api_key = proxy.get("api_key")
            payload = {"api_key": api_key, "url": url, "retry_404": "true"}
            try:
                r = requests.get("https://api.scraperapi.com/", params=payload, timeout=90, verify=False)   # SSL fix
                if r.status_code == 200 and r.content[:5] == b"%PDF-":
                    logger.info(f"      [DL] PDF downloaded via ScraperAPI: {len(r.content)} bytes")
                    return r.content
                else:
                    logger.warning("      [DL] ScraperAPI failed to retrieve valid PDF binary.")
            except Exception as e:
                logger.warning(f"      [DL] ScraperAPI request failed: {e}")

        if page:
            try:
                api_response = page.context.request.get(url)
                body = api_response.body()
                if body[:5] == b"%PDF-":
                    logger.info(f"      [DL] PDF downloaded via Playwright API request: {len(body)} bytes")
                    return body
            except Exception as e:
                logger.warning(f"      [DL] Playwright API request failed: {e}")

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
            except Exception as e:
                logger.warning(f"      [DL] Playwright download failed: {e}")

        if not pdf_bytes and self.orchestrator:
            logger.info(f"      [DL] TRIGERING MANUS AGENT FALLBACK for: {url}")
            goal = f"Download the primary legislative PDF for the Bill at this URL: {url}. Ensure it is a valid PDF binary."
            manus_result = self.orchestrator.call_manus_agent(goal)
            if manus_result and manus_result.startswith("http"):
                try:
                    r = requests.get(manus_result, timeout=30, verify=False)   # SSL fix
                    if r.content[:5] == b"%PDF-":
                        return r.content
                except:
                    pass

        logger.warning(f"      [DL] All download methods failed for: {url}")
        return None

    # ===================================================================
    #  BILL TRACKER ENRICHMENT ENGINE
    #  Runs after the primary bills pipeline. Reads tracker matrix PDFs,
    #  extracts tabular data, joins each row to an existing bill record,
    #  and writes a tracker_enrichment_*.json sidecar for sync_to_supabase.
    #  NEVER inserts new bill records. UPDATE-only on matched bills.
    # ===================================================================

    def _fetch_tracker_pdfs(self, page, target: dict) -> List[str]:
        """Scrape the Bill Tracker page and return all PDF URLs found."""
        pdf_urls = []
        try:
            page.goto(target["url"], wait_until="domcontentloaded", timeout=60000)
            if not self._wait_for_real_content(page, timeout_ms=20000):
                logger.warning("  [Tracker] Cloudflare block on Bill Tracker page.")
                return []
            page.wait_for_timeout(2000)
            links = page.evaluate("""
                () => Array.from(document.querySelectorAll('a[href$=".pdf"]'))
                         .map(a => a.href)
            """)
            pdf_urls = list(set(links))
            logger.info(f"  [Tracker] Found {len(pdf_urls)} tracker PDF(s)")
        except Exception as e:
            logger.error(f"  [Tracker] Failed to fetch tracker page: {e}")
        return pdf_urls

    def _extract_tracker_table(self, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract tabular rows from a Bill Tracker matrix PDF.
        Uses pdfplumber for cell-aware table extraction.
        Returns a list of dicts with keys: bill_no, title, sponsor,
        first_reading, committee_date, second_reading, third_reading,
        assent_date, current_status.
        """
        rows = []
        if not PDFPLUMBER_OK:
            logger.warning("  [Tracker] pdfplumber not installed — table extraction unavailable.")
            return rows
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page_num, pg in enumerate(pdf.pages):
                    tables = pg.extract_tables()
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        # Detect header row
                        header_raw = [str(c or "").strip().lower() for c in table[0]]
                        # Map column names flexibly
                        col = {}
                        for i, h in enumerate(header_raw):
                            if any(k in h for k in ["bill no", "bill_no", "no."]):
                                col["bill_no"] = i
                            elif any(k in h for k in ["title", "name", "short title"]):
                                col["title"] = i
                            elif any(k in h for k in ["sponsor", "mover", "proposer"]):
                                col["sponsor"] = i
                            elif any(k in h for k in ["1st", "first read"]):
                                col["first_reading"] = i
                            elif any(k in h for k in ["committee", "referral"]):
                                col["committee_date"] = i
                            elif any(k in h for k in ["2nd", "second read"]):
                                col["second_reading"] = i
                            elif any(k in h for k in ["3rd", "third read"]):
                                col["third_reading"] = i
                            elif any(k in h for k in ["assent", "signed", "enacted"]):
                                col["assent_date"] = i
                            elif any(k in h for k in ["status", "stage", "current"]):
                                col["current_status"] = i

                        if not col:
                            logger.debug(f"  [Tracker] Page {page_num+1}: no recognisable columns")
                            continue

                        for data_row in table[1:]:
                            if not data_row or all(c is None or str(c).strip() == "" for c in data_row):
                                continue
                            safe = lambda i: str(data_row[i] or "").strip() if i < len(data_row) else ""
                            row = {
                                "bill_no":        safe(col.get("bill_no", -1)),
                                "title":          safe(col.get("title", -1)),
                                "sponsor":        safe(col.get("sponsor", -1)),
                                "first_reading":  safe(col.get("first_reading", -1)),
                                "committee_date": safe(col.get("committee_date", -1)),
                                "second_reading": safe(col.get("second_reading", -1)),
                                "third_reading":  safe(col.get("third_reading", -1)),
                                "assent_date":    safe(col.get("assent_date", -1)),
                                "current_status": safe(col.get("current_status", -1)),
                            }
                            # Only keep rows that have at least a title or bill_no
                            if row["bill_no"] or row["title"]:
                                rows.append(row)
        except Exception as e:
            logger.error(f"  [Tracker] Table extraction failed: {e}")
        logger.info(f"  [Tracker] Extracted {len(rows)} row(s) from tracker matrix")
        return rows

    def _join_tracker_row_to_bill(self, tracker_row: Dict, bills_snapshot: List[Dict]) -> Optional[Dict]:
        """
        Three-key cascade join from a tracker row to a bill in bills_snapshot.
        Key 1: exact bill_no match.
        Key 2: fuzzy title match (>= 0.85 similarity).
        Key 3: LLM disambiguation (0.60–0.84 similarity).
        Returns the matched bill dict, or None if unmatched.
        """
        import difflib

        t_bill_no = re.sub(r'[^0-9]', '', tracker_row.get("bill_no", ""))
        t_title = (tracker_row.get("title") or "").strip().lower()

        # --- Key 1: bill_no exact match ---
        if t_bill_no:
            for bill in bills_snapshot:
                b_no = re.sub(r'[^0-9]', '', bill.get("bill_no", ""))
                if b_no and b_no == t_bill_no:
                    logger.debug(f"  [Tracker Join] bill_no match: {t_bill_no} -> '{bill['title']}'")
                    return bill

        # --- Key 2: fuzzy title ---
        if not t_title:
            return None

        best_ratio = 0.0
        best_bill = None
        for bill in bills_snapshot:
            b_title = (bill.get("title") or "").strip().lower()
            ratio = difflib.SequenceMatcher(None, t_title, b_title).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_bill = bill

        if best_ratio >= 0.85 and best_bill is not None:
            logger.debug(f"  [Tracker Join] fuzzy match ({best_ratio:.2f}): '{tracker_row['title']}' -> '{best_bill['title']}'")
            return best_bill

        # --- Key 3: LLM disambiguation ---
        if 0.60 <= best_ratio < 0.85 and best_bill and self.orchestrator:
            prompt = (
                f"Tracker title: \"{tracker_row['title']}\"\n"
                f"Database title: \"{best_bill['title']}\"\n\n"
                "Are these two titles referring to the same Kenyan legislative bill? "
                "Reply with exactly one word: YES or NO."
            )
            try:
                answer = self.orchestrator.fast_query(prompt)
                if isinstance(answer, str) and answer.strip().upper().startswith("YES"):
                    logger.info(f"  [Tracker Join] LLM confirmed match ({best_ratio:.2f}): '{tracker_row['title']}'")
                    return best_bill
                else:
                    logger.info(f"  [Tracker Join] LLM rejected match ({best_ratio:.2f}): '{tracker_row['title']}'")
            except Exception as e:
                logger.warning(f"  [Tracker Join] LLM disambiguation failed: {e}")

        logger.info(f"  [Tracker] UNMATCHED row (best={best_ratio:.2f}): '{tracker_row.get('title')}'")
        return None

    def _run_tracker_enrichment(self, page) -> Dict[str, Any]:
        """
        Main tracker enrichment orchestrator. Called from scrape_all() after
        the bills pipeline completes.

        Returns a dict:
          matched:   list of {bill_id, bill_title, enrichment_fields} ready for UPDATE
          unmatched: list of raw tracker rows that had no bill match
        """
        result = {"matched": [], "unmatched": [], "pdf_count": 0, "row_count": 0}

        # Find tracker targets
        tracker_targets = [t for t in self.targets if t.get("type") == "bill_tracker_matrix"]
        if not tracker_targets:
            logger.info("  [Tracker] No bill_tracker_matrix targets configured. Skipping.")
            return result

        # Use self.data as the bills join pool (already scraped this run)
        bills_snapshot = [b for b in self.data if b.get("title")]

        for target in tracker_targets:
            logger.info(f"\n>>> Tracker Enrichment: {target['name']}")
            pdf_urls = self._fetch_tracker_pdfs(page, target)
            result["pdf_count"] += len(pdf_urls)

            for pdf_url in pdf_urls:
                pdf_bytes = self._download_pdf(pdf_url, page)
                if not pdf_bytes:
                    logger.warning(f"  [Tracker] Could not download: {pdf_url}")
                    continue

                tracker_rows = self._extract_tracker_table(pdf_bytes)
                result["row_count"] += len(tracker_rows)

                for row in tracker_rows:
                    matched_bill = self._join_tracker_row_to_bill(row, bills_snapshot)

                    if matched_bill:
                        # Build enrichment payload — only tracker-owned fields
                        # Status advancement logic: only move FORWARD, never backward
                        STATUS_ORDER = [
                            "PUBLISHED", "1ST READING", "COMMITTEE", "2ND READING",
                            "REPORT STAGE", "COMMITTEE STAGE", "3RD READING",
                            "PASSED", "FORWARDED", "ASSENT"
                        ]
                        current_status = (matched_bill.get("status") or "").upper()
                        tracker_status = (row.get("current_status") or "").upper()
                        if STAGE_DETECTOR_OK and tracker_status:
                            tracker_status = normalize_stage_label(tracker_status).upper()

                        # Only update status if tracker stage is further along
                        new_status = current_status
                        try:
                            curr_idx = STATUS_ORDER.index(current_status)
                            track_idx = STATUS_ORDER.index(tracker_status)
                            if track_idx > curr_idx:
                                new_status = STATUS_ORDER[track_idx]
                        except ValueError:
                            pass  # Unknown stage — preserve existing

                        enrichment = {
                            "bill_title":          matched_bill["title"],
                            "bill_no":             matched_bill.get("bill_no") or row.get("bill_no"),
                            "tracker_status":      new_status,
                            "first_reading_date":  row["first_reading"] or None,
                            "committee_date":       row["committee_date"] or None,
                            "second_reading_date": row["second_reading"] or None,
                            "third_reading_date":  row["third_reading"] or None,
                            "assent_date":         row["assent_date"] or None,
                            "tracker_sponsor":     row["sponsor"] or None,
                            "source_pdf":          pdf_url,
                            "enriched_at":         datetime.now(timezone.utc).isoformat(),
                        }
                        result["matched"].append(enrichment)
                        logger.info(f"  [Tracker] MATCHED: '{matched_bill['title']}'")
                    else:
                        result["unmatched"].append({**row, "source_pdf": pdf_url})

        logger.info(
            f"\n--- Tracker Enrichment Results ---\n"
            f"  PDFs processed: {result['pdf_count']}\n"
            f"  Rows extracted: {result['row_count']}\n"
            f"  Matched:        {len(result['matched'])}\n"
            f"  Unmatched:      {len(result['unmatched'])}"
        )
        return result

    def save_data(self):
        fpath = f"processed_data/legislative/legislation_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved to {fpath}")
        return fpath

    def save_tracker_enrichment(self, enrichment_result: Dict[str, Any]) -> Optional[str]:
        """Save the tracker enrichment sidecar JSON for sync_to_supabase to consume."""
        if not enrichment_result.get("matched") and not enrichment_result.get("unmatched"):
            logger.info("  [Tracker] No enrichment data to save.")
            return None
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        fpath = f"processed_data/legislative/tracker_enrichment_{ts}.json"
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(enrichment_result, f, indent=2, ensure_ascii=False)
        logger.info(f"  [Tracker] Sidecar saved to {fpath}")
        return fpath


if __name__ == "__main__":
    scraper = LegislativeScraper(headless=True)
    scraper.scrape_all(max_pages=40)
    scraper.save_data()
    scraper.save_tracker_enrichment(scraper.tracker_enrichment)