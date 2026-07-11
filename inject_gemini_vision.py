import re

with open('scripts/legislative_scraper.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update docstring
code = code.replace(
    "3. OCR.space (Legacy fallback)",
    "3. Gemini Vision (Multimodal Fallback)\n      4. OCR.space (Legacy fallback)"
)
code = code.replace(
    "4. Cloudmersive (Legacy fallback)",
    "5. Cloudmersive (Legacy fallback)"
)
code = code.replace(
    "5. EasyOCR (Local unkillable fallback)",
    "6. EasyOCR (Local unkillable fallback)"
)

# 2. Add gemini_key and metrics
code = code.replace(
    'self.paddle_token = os.environ.get("PADDLEOCR_TOKEN", "")',
    'self.paddle_token = os.environ.get("PADDLEOCR_TOKEN", "")\n        self.gemini_key = os.environ.get("CEKA_GEMINI_API_KEY", "")'
)

code = code.replace(
    '"surya_failed": 0,',
    '"surya_failed": 0,\n            "gemini_requests": 0, "gemini_failed": 0,'
)

# 3. Add to ocr_fallback
ocr_fallback_gemini = """
        # 3. Gemini Vision
        if self.gemini_key:
            r = _handle_res(self._try_gemini_vision_ocr(pdf_bytes))
            if r: return r

        # 4. OCR.space"""

code = code.replace(
    '# 3. OCR.space',
    ocr_fallback_gemini.strip()
)

# 4. Add the new method _try_gemini_vision_ocr
gemini_method = """

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

    def _try_ocr_space"""

code = code.replace(
    '    def _try_ocr_space',
    gemini_method.lstrip('\n')
)

with open('scripts/legislative_scraper.py', 'w', encoding='utf-8') as f:
    f.write(code)
