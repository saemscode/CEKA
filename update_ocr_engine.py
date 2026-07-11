import re

with open('scripts/legislative_scraper.py', 'r', encoding='utf-8') as f:
    code = f.read()

new_engine = """class RemoteOCREngine:
    \"\"\"
    Production-grade remote OCR engine with cascading provider fallback.

    Provider chain:
      1. PaddleOCR API (State of the art Vision-Language Model)
      2. Surya API (High accuracy backup)
      3. OCR.space (Legacy fallback)
      4. Cloudmersive (Legacy fallback)
      5. EasyOCR (Local unkillable fallback)
    \"\"\"

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

        # 3. OCR.space
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
            lines = res_jsonl.text.strip().split('\\n')
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
            return {"text": "\\n\\n".join(combined_md), "source": "paddleocr", "engine": "VL-1.6", "pages": pages_processed, "confidence_estimate": 0.95, "notes": "PaddleOCR extraction successful."}
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
                    final = "\\n".join(all_text)
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
            final_text = "\\n".join(all_text)
            return {"text": final_text, "source": "easyocr", "engine": "local_cpu", "pages": pages, "confidence_estimate": 0.85, "notes": f"Local EasyOCR extracted from {len(pages)} pages."}
        except:
            self.metrics["easyocr_failed"] += 1
            return None

    def get_metrics(self) -> Dict[str, Any]:
        return {**self.metrics, "daily_requests_used": self._daily_counter, "daily_requests_remaining": max(0, self.OCR_SPACE_DAILY_LIMIT - self._daily_counter)}
"""

pattern = r'class RemoteOCREngine:.*?(?=class ProxyPool:)'
old_engine_block = re.search(pattern, code, re.S)

if old_engine_block:
    code = code[:old_engine_block.start()] + new_engine + "\n\n" + code[old_engine_block.end():]
    with open('scripts/legislative_scraper.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced RemoteOCREngine successfully.")
else:
    print("Failed to find RemoteOCREngine block.")
