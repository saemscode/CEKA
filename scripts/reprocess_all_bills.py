import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

# ── OCR: hardcode Tesseract + Poppler binary paths ──────────────────────────
import os as _os
_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
_POPPLER   = r"C:\poppler\poppler-24.08.0\Library\bin"
if _os.path.exists(_TESSERACT):
    try:
        import pytesseract as _pyt
        _pyt.pytesseract.tesseract_cmd = _TESSERACT
    except ImportError:
        pass
if _os.path.isdir(_POPPLER):
    _os.environ["PATH"] = _POPPLER + _os.pathsep + _os.environ.get("PATH", "")


try:
    from supabase_direct import SupabaseDirect
    from sovereign_corroborator import SovereignCorroborator
    from multi_llm_orchestrator import MultiLLMOrchestrator
    from enriched_bill_prompts import build_enrichment_prompt
except ImportError as e:
    print(f"Error: Missing dependency — {e}")
    exit(1)

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [STAGE-DETECTOR] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("reprocess_all_bills.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Distillation prompt — used for BOTH full-text and title-only modes
# ---------------------------------------------------------------------------
DISTIL_SYSTEM = (
    "You are a Kenyan legislative intelligence analyst. "
    "Return ONLY valid JSON with no markdown fences or commentary."
)

def build_distil_prompt(title: str, text: str = "") -> str:
    if text and len(text) >= 50:
        content_block = f"BILL TEXT (first 8500 chars):\n{text[:8500]}"
        mode = "full text"
    else:
        content_block = "(No bill text available — infer from title only)"
        mode = "title-only inference"

    return f"""Analyze this Kenyan legislative document ({mode}) and return a JSON object with EXACTLY these keys:

BILL TITLE: {title}
{content_block}

Return JSON:
{{
  "sponsor": "Name of bill sponsor (e.g., Cabinet Secretary, Senator X, Government). Use 'Government' if unclear.",
  "short_title": "A clean, short descriptive name for the bill (e.g. 'Income Tax Amendment 2026')",
  "summary": "3-4 sentence neutral summary of what the bill does and its policy implications. Include constitutional anchors.",
  "constitutional_section": "Comma-separated list of relevant Articles (e.g. 'Article 201, Article 206, Chapter 12'). Must include at least one.",
  "ai_concerns": ["Concern 1 in plain English", "Concern 2", "Concern 3 — at least 3 citizen concerns"],
  "tabloid_summary": "One punchy sentence (max 30 words) a tabloid would use to describe this bill's impact on Kenyans.",
  "status": "Current legislative stage — one of: Publication, First Reading, Second Reading, Committee Stage, Third Reading, Presidential Assent, Made into Law"
}}

RULES:
- constitutional_section MUST reference specific articles from the Constitution of Kenya 2010
- ai_concerns MUST be an array of at least 3 strings in plain English (not Swahili)
- tabloid_summary MUST be ONE sentence, punchy, max 30 words
- If bill is about taxation → cite Article 201, 209, 210
- If bill is about governance → cite Article 10, 27, 73
- If bill is about criminal law → cite Article 49, 50, 157, 159
- If bill is about land → cite Article 40, 60, 61
- Return ONLY the JSON object, no preamble"""


class BatchIntelligenceUpgrader:
    def __init__(self):
        self.db = SupabaseDirect()
        logger.info("✅ SupabaseDirect client connected successfully.")
        self.corroborator = SovereignCorroborator()
        self.orchestrator = MultiLLMOrchestrator()

        # Find poppler for OCR — confirmed install at C:\poppler\poppler-24.08.0\Library\bin
        self.poppler_path = None
        for p in [
            r"C:\poppler\poppler-24.08.0\Library\bin",   # ← confirmed install
            r"C:\ProgramData\chocolatey\lib\poppler\tools\bin",
            r"C:\ProgramData\chocolatey\lib\poppler\bin",
            r"C:\Program Files\poppler\bin",
            r"C:\Program Files (x86)\poppler\bin",
            r"C:\poppler\bin",
        ]:
            if os.path.isdir(p):
                self.poppler_path = p
                # Also inject into PATH for this process so pdf2image picks it up
                os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
                logger.info(f"  → Poppler found at: {p}")
                break
        if not self.poppler_path:
            logger.warning("  → Poppler not found — OCR will be limited.")

    def fetch_all_bills(self) -> List[Dict[str, Any]]:
        logger.info("Fetching all bills from database for full upgrade...")
        bills = self.db.select("bills", "id,title,text_content,url,pdf_url,status,sponsor,analysis_status")
        if not bills:
            bills = []
        logger.info(f"  → {len(bills)} bills found.")
        return bills

    # -----------------------------------------------------------------------
    # Core distillation — works with text OR title-only
    # -----------------------------------------------------------------------
    def _run_distillation(self, title: str, text: str = "") -> Optional[Dict[str, Any]]:
        """Run LLM distillation. Falls back gracefully to title-only mode."""
        prompt = build_distil_prompt(title, text)
        raw = self.orchestrator.synthesize(prompt, DISTIL_SYSTEM)
        if not raw:
            return None
        intel = self.orchestrator.extract_json(raw)
        return intel if intel else None

    # -----------------------------------------------------------------------
    # PDF Text Extraction
    # -----------------------------------------------------------------------
    def _extract_pdf_text(self, pdf_url: str) -> str:
        if not pdf_url or not pdf_url.lower().endswith(".pdf"):
            return ""
        try:
            import requests as req
            r = req.get(pdf_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200:
                return ""
            content = r.content

            # Try pdfplumber first (handles most text PDFs)
            try:
                import pdfplumber, io
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text = "\n".join(p.extract_text() or "" for p in pdf.pages)
                if text and len(text) >= 50:
                    return text
            except Exception:
                pass

            # Try PyMuPDF
            try:
                import fitz, io
                doc = fitz.open(stream=content, filetype="pdf")
                text = "\n".join(page.get_text() for page in doc)
                if text and len(text) >= 50:
                    return text
            except Exception:
                pass

            # OCR fallback (Tesseract + pdf2image)
            try:
                import pytesseract
                from pdf2image import convert_from_bytes
                pages = convert_from_bytes(content, dpi=200, poppler_path=self.poppler_path)
                text = "\n".join(pytesseract.image_to_string(p) for p in pages)
                if text and len(text) >= 50:
                    logger.info("    → Extracted via Tesseract OCR.")
                    return text
            except Exception as ocr_err:
                logger.warning(f"    → OCR failed: {ocr_err}")

        except Exception as e:
            logger.warning(f"    → PDF fetch failed: {e}")
        return ""

    # -----------------------------------------------------------------------
    # Stage detection from text
    # -----------------------------------------------------------------------
    def _detect_stage(self, text: str, current_status: str) -> Optional[str]:
        tl = text.lower()
        if "assented" in tl or "received assent" in tl or "presidential assent" in tl:
            return "Presidential Assent"
        if "act no" in tl or "kenya gazette supplement" in tl or "made into law" in tl:
            return "Made into Law"
        return None

    # -----------------------------------------------------------------------
    # Save distillation results to DB
    # -----------------------------------------------------------------------
    def _save_intel(self, bill_id: str, intel: Dict[str, Any], text: str,
                    current_bill: Dict[str, Any], title_only: bool = False):
        """Persist all extracted intelligence fields to the bills table."""
        ai_concerns = intel.get("ai_concerns")
        if isinstance(ai_concerns, list):
            ai_concerns_json = json.dumps(ai_concerns)
        else:
            ai_concerns_json = None

        update_data = {
            "summary": intel.get("summary") or current_bill.get("summary"),
            # description is now reserved for the enriched narrative — don't overwrite with short_title
            "sponsor": intel.get("sponsor") or current_bill.get("sponsor") or "Government",
            "constitutional_section": intel.get("constitutional_section") or current_bill.get("constitutional_section"),
            "is_money_bill": intel.get("is_money_bill"), # NEW
            "concerns_counties": intel.get("concerns_counties"), # NEW
            "ai_concerns": ai_concerns_json,
            "tabloid_summary": intel.get("tabloid_summary"),
            "analysis_status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Only persist text if it's real extracted content (not title-only)
        if text and len(text) >= 50:
            update_data["text_content"] = text[:50000]

        # ── Stage Regression Guard ──
        # Determine the highest confirmed non-discarded stage from the DB stages JSON
        current_stages = current_bill.get("stages") or {}
        if isinstance(current_stages, str):
            try:
                current_stages = json.loads(current_stages)
            except Exception:
                current_stages = {}

        _STAGE_ORDER = {
            "pre_publication": 0, "publication": 1, "first_reading": 2,
            "second_reading": 3, "committee": 4, "report": 5,
            "third_reading": 6, "mediation": 7, "assent": 8,
        }
        highest_confirmed = -1
        for sk, sv in current_stages.items():
            if isinstance(sv, dict) and sv.get("status") == "completed" and sk != "discarded":
                highest_confirmed = max(highest_confirmed, _STAGE_ORDER.get(sk, -1))

        # Check for status_lock
        has_lock = current_bill.get("status_lock", False)

        # Stage detection — only override if we have strong signal AND no regression
        if not has_lock:
            if text and len(text) >= 50:
                detected_stage = self._detect_stage(text, current_bill.get("status", ""))
                if detected_stage:
                    update_data["status"] = detected_stage
                elif intel.get("status") and intel["status"] != "Not explicitly stated in the provided text":
                    inferred_status = intel["status"]
                    # ── Regression Guard: Don't let LLM regress to DISCARDED if stages show progress ──
                    inferred_lower = inferred_status.lower().strip()
                    is_terminal = inferred_lower in ("discarded", "withdrawn", "rejected", "negatived", "lapsed")
                    if is_terminal and highest_confirmed >= _STAGE_ORDER.get("first_reading", 2):
                        logger.info(f"    [Regression Guard] Blocking LLM-inferred '{inferred_status}' — confirmed stages up to order {highest_confirmed}")
                    else:
                        update_data["status"] = inferred_status
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        self.db.update("bills", update_data, eq="id", eq_val=bill_id)

        mode_tag = " [title-only]" if title_only else ""
        logger.info(f"    ✅ Distillation saved to DB{mode_tag}.")

    # -----------------------------------------------------------------------
    # Per-bill processing
    # -----------------------------------------------------------------------
    def reprocess_bill(self, bill: Dict[str, Any]):
        bill_id = bill["id"]
        title = bill.get("title", "Untitled")

        # ── Status Lock Guard: Skip all processing if bill is locked ──
        if bill.get("status_lock"):
            logger.info(("-" * 60))
            logger.info(f"🔒 LOCKED: Skipping {title} ({bill_id})")
            return
            
        logger.info("-" * 60)
        logger.info(f"UPGRADING: {title} ({bill_id})")

        # ── Step 1: Text Extraction ──────────────────────────────────────
        text = bill.get("text_content") or ""
        if not text or len(text) < 50:
            logger.info("  [1/4] Text missing — attempting re-extraction from PDF URL...")
            pdf_url = bill.get("pdf_url") or bill.get("url")
            text = self._extract_pdf_text(pdf_url)
            if text and len(text) >= 50:
                logger.info(f"    → Extracted {len(text)} chars from PDF.")
            else:
                logger.info("    → No PDF text — will use title-only LLM inference.")
        else:
            logger.info(f"  [1/4] Text already present ({len(text)} chars).")

        # ── Step 2: LLM Distillation (ALWAYS runs — title-only if no text) ─
        logger.info("  [2/4] Running Multi-LLM Distillation...")
        title_only = not text or len(text) < 50
        try:
            intel = self._run_distillation(title, text if not title_only else "")
            if intel:
                self._save_intel(bill_id, intel, text, bill, title_only=title_only)
            else:
                logger.warning("    ⚠️ Distillation returned empty intel. Marking failed.")
                self.db.update("bills", {"analysis_status": "failed"}, eq="id", eq_val=bill_id)
        except Exception as e:
            logger.error(f"    ❌ Distillation failed: {e}")
            try:
                self.db.update("bills", {"analysis_status": "failed"}, eq="id", eq_val=bill_id)
            except Exception:
                pass

        # ── Step 2.5: Enriched Description (Human-Tone Narrative → description column) ──
        logger.info("  [2.5/4] Generating Human-Tone Enriched Description...")
        try:
            # Re-fetch the latest bill record so we have fresh intel from Step 2
            fresh_bills = self.db.select("bills", "*", eq="id", eq_val=bill_id)
            fresh_bill = fresh_bills[0] if fresh_bills else bill

            # Only re-enrich if description is empty OR the bill was recently updated
            should_enrich = (
                not fresh_bill.get("description") or
                not fresh_bill.get("enriched_at") or
                fresh_bill.get("analysis_status") == "pending"
            )

            if should_enrich:
                enrich_prompt = build_enrichment_prompt(
                    title=title,
                    text_content=text,
                    existing_summary=fresh_bill.get("summary"),
                    existing_description=fresh_bill.get("description"),
                    constitutional_section=fresh_bill.get("constitutional_section"),
                    sponsor=fresh_bill.get("sponsor"),
                    status=fresh_bill.get("status"),
                    ai_concerns=json.loads(fresh_bill["ai_concerns"]) if isinstance(fresh_bill.get("ai_concerns"), str) else fresh_bill.get("ai_concerns"),
                    category=fresh_bill.get("category"),
                )

                enriched_raw = self.orchestrator.synthesize(
                    enrich_prompt,
                    "You are CEKA's Human-Tone Legislative Enrichment Engine. Return pure prose only. No JSON, no markdown fences, no preamble."
                )

                if enriched_raw and len(enriched_raw.strip()) >= 300:
                    # ── Normalization: strip any markdown fences or JSON that leaked through ──
                    normalized = enriched_raw.strip()

                    # Strip markdown fences if the LLM wrapped the output
                    if normalized.startswith("```"):
                        lines = normalized.split("\n")
                        normalized = "\n".join(
                            l for l in lines if not l.startswith("```")
                        ).strip()

                    # Strip JSON-like preamble ({, [) if it leaked through
                    if normalized and normalized[0] in ("{", "["):
                        normalized = ""  # Invalid — LLM returned JSON instead of prose

                    # Strip common LLM preambles
                    preamble_markers = [
                        "here is the enriched", "here's the enriched",
                        "the following is", "below is", "i'll now",
                    ]
                    first_line_lower = normalized.split("\n")[0].lower().strip()
                    if any(first_line_lower.startswith(p) for p in preamble_markers):
                        # Skip first line — it's a preamble
                        normalized = "\n".join(normalized.split("\n")[1:]).strip()

                    if normalized and len(normalized) >= 300:
                        self.db.update(
                            "bills",
                            {
                                "description": normalized[:8000],
                                "enriched_at": datetime.now(timezone.utc).isoformat(),
                            },
                            eq="id",
                            eq_val=bill_id
                        )
                        logger.info(f"    ✅ Enriched description saved ({len(normalized)} chars).")
                    else:
                        logger.warning("    ⚠️ Normalization resulted in empty/short output — enrichment skipped.")
                else:
                    logger.warning("    ⚠️ LLM returned empty or too-short enrichment — skipping.")
            else:
                logger.info("    → Enrichment skipped (already enriched and no updates).")
        except Exception as e:
            logger.error(f"    ❌ Enrichment step failed: {e}")

        # ── Step 3: Sovereign Corroborator ────────────────────────────────
        logger.info("  [3/4] Wait skipped — Sovereign Corroborator running...")
        logger.info("  [4/4] Regenerating Sovereign Intelligence Narrative...")
        try:
            success = self.corroborator.process_bill(bill_id)
            if success:
                logger.info("    ✅ Narrative synthesized.")
            else:
                logger.warning("    ⚠️ Corroborator returned no result.")
        except Exception as e:
            logger.error(f"    ❌ Corroborator failed: {e}")

    def run(self, bill_ids: Optional[List[str]] = None):
        if bill_ids:
            logger.info(f"🚀 Targeted run for {len(bill_ids)} specific bills...")
            bills = []
            for bid in bill_ids:
                res = self.db.select("bills", "*", eq="id", eq_val=bid)
                if res: bills.extend(res)
        else:
            bills = self.fetch_all_bills()
            
        total = len(bills)
        if total == 0:
            logger.warning("No bills found to process.")
            return

        logger.info(f"🚀 Starting intelligence upgrade on {total} bills...")
        ok, err = 0, 0
        for i, bill in enumerate(bills):
            try:
                self.reprocess_bill(bill)
                ok += 1
                time.sleep(1)   # respect rate limits
            except Exception as e:
                logger.error(f"❌ Failed on '{bill.get('title')}': {e}")
                err += 1

            if (i + 1) % 5 == 0 or (i + 1) == total:
                logger.info(f"📊 Progress: {i+1}/{total} | OK={ok} ERR={err}")

        logger.info("🏁 UPGRADE COMPLETE.")
        logger.info(f"    Total: {total} | Success: {ok} | Failed: {err}")


if __name__ == "__main__":
    import sys
    # Extract IDs from args if provided (space-separated)
    target_ids = sys.argv[1:] if len(sys.argv) > 1 else None
    
    upgrader = BatchIntelligenceUpgrader()
    upgrader.run(target_ids)
