"""
sovereign_refresh.py — Phase A: Sovereign Refresh (Broad Sweep)
================================================================
PURPOSE:
    Non-destructive weekly run that upgrades all 500+ bills in public.bills.
    Only fills NULL/missing columns. NEVER overwrites existing data.
    Routes all intelligence generation through the full Sovereign Mesh
    (DeepSeek → Groq → Cerebras → Cohere → Gemini) and the Sentinel
    Master Prompt (CEKA/context/CEKA-AI-Prompt.md).

USAGE:
    python CEKA/scripts/sovereign_refresh.py
    python CEKA/scripts/sovereign_refresh.py --limit 50       # batch of 50
    python CEKA/scripts/sovereign_refresh.py --force          # re-process all, even complete ones

RUNS: Weekly (every Monday 06:00 EAT via GitHub Actions schedule)
"""

import os
import sys
import json
import logging
import time
import re
import argparse
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

# ---------------------------------------------------------------------------
# Environment Bootstrap
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

# Tesseract / Poppler binary paths (Windows local)
_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
_POPPLER   = r"C:\poppler\poppler-24.08.0\Library\bin"
if os.path.exists(_TESSERACT):
    try:
        import pytesseract as _pyt
        _pyt.pytesseract.tesseract_cmd = _TESSERACT
    except ImportError:
        pass
if os.path.isdir(_POPPLER):
    os.environ["PATH"] = _POPPLER + os.pathsep + os.environ.get("PATH", "")

# ---------------------------------------------------------------------------
# Import pipeline dependencies (graceful-degrade)
# ---------------------------------------------------------------------------
try:
    from supabase_direct import SupabaseDirect
    DB_OK = True
except ImportError:
    DB_OK = False

try:
    from multi_llm_orchestrator import MultiLLMOrchestrator
    ORCH_OK = True
except ImportError:
    ORCH_OK = False

try:
    from omni_sync_engine import AttunedSynchronizer
    MESH_OK = True
except ImportError:
    MESH_OK = False

try:
    from stage_detector import normalize_stage_label
    STAGES_OK = True
except ImportError:
    STAGES_OK = False

try:
    from cohere import Client as CohereClient
    COHERE_OK = True
except ImportError:
    COHERE_OK = False

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [SOVEREIGN-REFRESH] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("sovereign_refresh.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — 30-Column NULL Audit Definitions
# ---------------------------------------------------------------------------
# Columns that are eligible for AI-driven fill:
AI_FILLABLE_COLUMNS = [
    "neural_summary", "tabloid_summary", "ai_concerns",
    "constitutional_section", "corroboration_score",
    "sponsor", "summary", "description",
    "is_money_bill", "concerns_counties",
    "analysis_status",
]

# Columns that require PDF re-extraction first:
TEXT_DEPENDENT_COLUMNS = [
    "neural_summary", "tabloid_summary", "ai_concerns",
    "constitutional_section", "is_money_bill", "concerns_counties",
    "sponsor",
]

# Structural columns that can be populated from title/url alone:
STRUCTURAL_COLUMNS = [
    "bill_no", "gazette_no", "session_year", "house", "date", "category",
]

# The full 30-col schema set — columns checked for NULL during sweep:
ALL_MONITORED_COLUMNS = AI_FILLABLE_COLUMNS + STRUCTURAL_COLUMNS + [
    "status", "text_content", "pdf_url", "url", "stages",
    "sponsor_title", "verified_sources", "history",
]

# ---------------------------------------------------------------------------
# Portfolio Keyword Pools (No Mediocrity Classification)
# ---------------------------------------------------------------------------
PORTFOLIO_KEYWORD_POOL = {
    "Finance": [
        "tax", "vat", "revenue", "treasury", "budget", "finance", "appropriation",
        "audit", "money", "bank", "financial", "account", "expenditure", "excise",
        "customs", "levy", "duty", "fiscal", "pension", "debt"
    ],
    "Education": [
        "school", "university", "teacher", "student", "education", "learning",
        "curriculum", "science", "technology", "tvet", "training", "academic",
        "scholarship", "college", "exam", "primary", "secondary"
    ],
    "Healthcare": [
        "health", "medical", "hospital", "nhif", "sha", "doctor", "nurse",
        "vaccine", "disease", "clinical", "pharmacy", "patient", "medicine",
        "surgical", "public health", "drug", "clinic"
    ],
    "Environment": [
        "environment", "climate", "forest", "water", "land", "wildlife", "nature",
        "pollution", "carbon", "mining", "natural resources", "conservation",
        "agriculture", "farming", "crop", "livestock", "renewable"
    ],
    "Governance": [
        "election", "iebc", "parliament", "county", "devolution", "ethics",
        "corruption", "judiciary", "justice", "law", "constitution", "rights",
        "public service", "administration", "leadership", "executive"
    ]
}

# ---------------------------------------------------------------------------
# Sentinel Master Prompt Loader
# ---------------------------------------------------------------------------
def load_sentinel_prompt() -> str:
    """Load the CEKA-AI-Prompt.md from the project context directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "context", "CEKA-AI-Prompt.md")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            content = f.read()
        logger.info(f"✅ Sentinel Master Prompt loaded ({len(content)} chars)")
        return content
    logger.warning("⚠️ CEKA-AI-Prompt.md not found — using fallback system prompt.")
    return (
        "You are CEKA's Sovereign Legislative Intelligence Engine for Kenya. "
        "You are precise, factual, and anchored in the Constitution of Kenya 2010. "
        "Return ONLY valid JSON. No markdown fences. No commentary."
    )

# ---------------------------------------------------------------------------
# PDF Text Extraction (full cascade: pdfplumber → fitz → OCR)
# ---------------------------------------------------------------------------
def extract_pdf_text(pdf_url: str) -> str:
    """Downloads and extracts text from a PDF URL using a full cascade."""
    if not pdf_url or not pdf_url.lower().endswith(".pdf"):
        return ""
    try:
        import requests
        r = requests.get(pdf_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return ""
        content = r.content

        # 1. pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = "\n".join(p.extract_text() or "" for p in pdf.pages)
            if text and len(text) >= 50:
                return text
        except Exception:
            pass

        # 2. PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
            if text and len(text) >= 50:
                return text
        except Exception:
            pass

        # 3. Tesseract OCR (scanned PDFs)
        try:
            import pytesseract
            from pdf2image import convert_from_bytes
            pages = convert_from_bytes(content, dpi=200, poppler_path=_POPPLER if os.path.isdir(_POPPLER) else None)
            text = "\n".join(pytesseract.image_to_string(p) for p in pages)
            if text and len(text) >= 50:
                logger.info("    → Extracted via Tesseract OCR.")
                return text
        except Exception as ocr_err:
            logger.warning(f"    → OCR failed: {ocr_err}")

    except Exception as e:
        logger.warning(f"    → PDF fetch failed: {e}")
    return ""

# ---------------------------------------------------------------------------
# Stage Detection (12+ Pattern Dictionary)
# ---------------------------------------------------------------------------
STAGE_PATTERNS = [
    (r'\bPRESIDENTIAL\s+ASSENT\b', "Presidential Assent"),
    (r'\bASSENTED\b', "Presidential Assent"),
    (r'\bSIGNED\s+INTO\s+LAW\b', "Made into Law"),
    (r'\bACT\s+NO\b', "Made into Law"),
    (r'\bKENYA\s+GAZETTE\s+SUPPLEMENT\b', "Made into Law"),
    (r'\bTHIRD\s+READING\b', "Third Reading"),
    (r'\b3RD\s+READING\b', "Third Reading"),
    (r'\bREPORT\s+STAGE\b', "Committee Stage"),
    (r'\bCOMMITTEE\s+STAGE\b', "Committee Stage"),
    (r'\bSECOND\s+READING\b', "Second Reading"),
    (r'\b2ND\s+READING\b', "Second Reading"),
    (r'\bFIRST\s+READING\b', "First Reading"),
    (r'\b1ST\s+READING\b', "First Reading"),
    (r'\bNEGATIVED\b', "Negatived"),
    (r'\bWITHDRAWN\b', "Withdrawn"),
    (r'\bFORWARDED\b', "Forwarded"),
    (r'\bPUBLISHED\b', "Publication"),
    (r'\bGAZETTED\b', "Publication"),
]

def detect_stage_from_text(text: str) -> Optional[str]:
    """Run the 12+ stage dictionary against text. Returns stage string or None."""
    if not text:
        return None
    upper = text.upper()
    for pattern, stage in STAGE_PATTERNS:
        if re.search(pattern, upper):
            return stage
    return None

# ---------------------------------------------------------------------------
# Cohere Constitutional Reranker
# ---------------------------------------------------------------------------
def cohere_constitutional_rerank(db: "SupabaseDirect", bill_title: str, bill_summary: str) -> str:
    """Uses Cohere to rerank constitution articles against bill context."""
    if not COHERE_OK:
        return ""
    cohere_key = os.getenv("COHERE_API_KEY", "")
    if not cohere_key:
        return ""
    try:
        client = CohereClient(cohere_key)
        # Attempt to pull constitution articles from DB
        res = db.select("constitution_articles", "clause_ref,content", limit=80)
        docs = [f"[{d['clause_ref']}]: {d['content']}" for d in (res or [])]
        if not docs:
            return ""
        rerank = client.rerank(
            query=f"{bill_title} {bill_summary}",
            documents=docs,
            top_n=5,
            model="rerank-english-v3.0"
        )
        selected = [docs[hit.index] for hit in rerank.results]
        refs = re.findall(r'\[([^\]]+)\]', "\n".join(selected))
        return ", ".join(refs[:5]) if refs else ", ".join(d.split(":")[0].strip("[]") for d in selected[:3])
    except Exception as e:
        logger.warning(f"    → Cohere Rerank failed: {e}")
        return ""

# ---------------------------------------------------------------------------
# Build Sovereign Distillation Prompt
# ---------------------------------------------------------------------------
def build_phase_a_prompt(bill: Dict[str, Any], sentinel_prompt: str) -> str:
    """Builds a full-context prompt from the bill row for Phase A distillation."""
    title = bill.get("title", "Untitled Bill")
    text = (bill.get("text_content") or "")[:12000]
    existing = {
        k: v for k, v in bill.items()
        if v is not None and k not in ["text_content", "id", "created_at", "updated_at"]
    }

    mode = "FULL TEXT ANALYSIS" if len(text) >= 100 else "TITLE + METADATA-ONLY INFERENCE"

    return f"""{sentinel_prompt}

---
MISSION: SOVEREIGN INTELLIGENCE DISTILLATION
MODE: {mode}
BILL TITLE: {title}

EXISTING DATABASE CONTEXT (DO NOT REPEAT — ONLY FILL MISSING):
{json.dumps(existing, indent=2, default=str)}

BILL TEXT (first 12,000 chars):
{text if text else "(No text available — infer from title and existing context)"}

TASK: Based on the above, return a SINGLE valid JSON object with ALL of the following keys.
If a field already exists in the EXISTING DATABASE CONTEXT above, return the exact same value — DO NOT CHANGE existing data.
Only generate new values for keys where the existing value is null, empty, or missing.

{{
  "sponsor": "Full name of bill sponsor. Search Memorandum of Objects and Reasons section. Default: 'Government'",
  "sponsor_title": "Hon. / Cabinet Secretary / Senator / etc.",
  "short_title": "Clean descriptive title (e.g. 'Income Tax Amendment 2026')",
  "summary": "3-5 sentence neutral summary of what this bill does and its policy implications.",
  "neural_summary": "Rigorous 2-paragraph legal analysis for scholars and policy makers.",
  "tabloid_summary": "ONE punchy sentence (max 30 words) a tabloid headline would use.",
  "constitutional_section": "Comma-separated list of affected Articles from the Constitution of Kenya 2010. At least one required.",
  "ai_concerns": ["Concern 1 in plain English", "Concern 2", "Concern 3 — minimum 3 citizen-level concerns"],
  "is_money_bill": true or false,
  "concerns_counties": true or false,
  "status": "One of: Publication, First Reading, Second Reading, Committee Stage, Third Reading, Presidential Assent, Made into Law, Negatived, Withdrawn",
  "corroboration_score": 0-100,
  "bill_no": "e.g. 'No. 14 of 2024' — extract from text if present, else null",
  "session_year": "e.g. 2024 — integer year from bill number or text",
  "gazette_no": "Gazette notice number if present, else null",
  "house": "National Assembly or Senate — infer from title or text context",
  "category": "Must be exactly one of: ['Finance', 'Education', 'Healthcare', 'Environment', 'Governance']"
}}

RULES:
- Return ONLY the JSON object. No preamble. No markdown fences.
- category MUST be strictly one of the 5 authorized portfolios based on core intent.
- constitutional_section MUST reference specific articles (e.g. 'Article 201, Article 209, Chapter 12').
- ai_concerns MUST be a JSON array of at least 3 plain-English strings.
- tabloid_summary MUST be ONE sentence, not more than 30 words.
- is_money_bill: true if bill involves public funds, taxation, fees, or Consolidated Fund.
- concerns_counties: true if bill affects devolution, county governments, or county functions.
- If bill text is about taxation → cite Article 201, 209, 210.
- If bill text is about governance → cite Article 10, 27, 73.
- If bill text is about criminal law → cite Article 49, 50, 157, 159.
- If bill text is about land → cite Article 40, 60, 61.
"""

# ---------------------------------------------------------------------------
# Phase A: SovereignRefresh Class
# ---------------------------------------------------------------------------
class SovereignRefresh:
    """
    Phase A: Non-destructive weekly sweep of all bills.
    Fills NULL/missing columns using the full Sovereign Intelligence Mesh.
    Never overwrites existing non-null data.
    """

    def __init__(self, force: bool = False):
        self.force = force
        if not DB_OK:
            raise ImportError("supabase_direct.py not found. Cannot proceed.")
        self.db = SupabaseDirect()
        logger.info("✅ SupabaseDirect connected.")

        # Load the Sentinel Master Prompt
        self.sentinel_prompt = load_sentinel_prompt()

        # Initialize Multi-LLM Orchestrator (10-provider chain)
        if ORCH_OK:
            self.orchestrator = MultiLLMOrchestrator()
            logger.info("✅ Multi-LLM Orchestrator initialized (10-provider chain).")
        else:
            self.orchestrator = None
            logger.warning("⚠️ MultiLLMOrchestrator unavailable — AI distillation disabled.")

        # Statistics
        self.stats = {
            "total": 0, "skipped": 0, "upgraded": 0,
            "pdf_extracted": 0, "ai_filled": 0, "failed": 0,
        }

    def _fetch_all_bills(self, limit: Optional[int] = None, target_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetches bills from the database for Phase A sweep."""
        columns = (
            "id,title,url,pdf_url,text_content,status,sponsor,sponsor_title,"
            "summary,description,neural_summary,tabloid_summary,ai_concerns,"
            "constitutional_section,corroboration_score,is_money_bill,"
            "concerns_counties,bill_no,gazette_no,session_year,house,date,"
            "category,stages,analysis_status,verified_sources,history"
        )
        
        if target_id:
            logger.info(f"🎯 Targeting specific bill ID: {target_id}")
            bills = self.db.select("bills", columns, eq="id", eq_val=target_id)
        else:
            bills = self.db.select("bills", columns, limit=limit)

        if not bills:
            bills = []
        logger.info(f"📋 Fetched {len(bills)} bills for Phase A sweep.")
        return bills

    def _needs_upgrade(self, bill: Dict[str, Any]) -> bool:
        """Returns True if any monitored column is NULL/missing."""
        if self.force:
            return True
        # Check AI-fillable columns for NULL/empty
        for col in AI_FILLABLE_COLUMNS:
            val = bill.get(col)
            if val is None or val == "" or val == [] or val == "Government":
                return True
        # Check structural columns
        for col in ["bill_no", "house", "status"]:
            if not bill.get(col):
                return True
        return False

    def _run_ai_distillation(self, bill: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Routes bill through the full Sovereign Mesh for distillation."""
        if not self.orchestrator:
            return None
        prompt = build_phase_a_prompt(bill, self.sentinel_prompt)
        raw = self.orchestrator.synthesize(prompt, system_prompt="")
        if not raw:
            return None
        return self.orchestrator.extract_json(raw)

    def _atomic_patch(self, bill_id: str, intel: Dict[str, Any], bill: Dict[str, Any], text: str):
        """
        Atomic PATCH: Only writes fields that are currently NULL in the database.
        Never overwrites existing non-null data.
        """
        update_data = {}

        # Map intel output → database columns, only if target is currently empty
        field_map = {
            "sponsor": "sponsor",
            "sponsor_title": "sponsor_title",
            "short_title": "description",
            "summary": "summary",
            "neural_summary": "neural_summary",
            "tabloid_summary": "tabloid_summary",
            "constitutional_section": "constitutional_section",
            "corroboration_score": "corroboration_score",
            "is_money_bill": "is_money_bill",
            "concerns_counties": "concerns_counties",
            "status": "status",
            "bill_no": "bill_no",
            "session_year": "session_year",
            "gazette_no": "gazette_no",
            "house": "house",
        }

        for intel_key, db_col in field_map.items():
            existing_val = bill.get(db_col)
            new_val = intel.get(intel_key)
            # Only patch if the existing value is truly empty, and intel has a real value
            if (existing_val is None or existing_val == "" or existing_val == "Government") and new_val:
                update_data[db_col] = new_val

        # ai_concerns — must be serialized as JSON string
        if not bill.get("ai_concerns"):
            ai_concerns = intel.get("ai_concerns")
            if isinstance(ai_concerns, list) and len(ai_concerns) >= 1:
                update_data["ai_concerns"] = json.dumps(ai_concerns)

        # text_content — only write if it was fetched fresh and is non-trivial
        if not bill.get("text_content") and text and len(text) >= 100:
            update_data["text_content"] = text[:50000]

        # Stage detection from text (12+ dictionary)
        if text and not bill.get("status"):
            detected = detect_stage_from_text(text)
            if detected:
                update_data["status"] = detected
                if STAGES_OK:
                    update_data["status"] = normalize_stage_label(detected)

        # Cohere Constitutional Reranking — only if constitutional_section is missing
        if not bill.get("constitutional_section") and (bill.get("summary") or intel.get("summary")):
            cohere_result = cohere_constitutional_rerank(
                self.db,
                bill.get("title", ""),
                bill.get("summary") or intel.get("summary", "")
            )
            if cohere_result:
                update_data["constitutional_section"] = cohere_result

        # analysis_status → mark complete if we've filled key fields
        if "neural_summary" in update_data or "summary" in update_data:
            update_data["analysis_status"] = "completed"

        # --- SOVEREIGN AI CHECKER LAYER (Categorization) ---
        ai_cat = update_data.get("category") or bill.get("category")
        if not ai_cat or ai_cat not in PORTFOLIO_KEYWORD_POOL:
            # Re-run keyword density check if AI fails or category is missing
            logger.info(f"    [AI Checker] Validating portfolio classification for '{bill.get('title')[:30]}...'")
            scores = {cat: 0 for cat in PORTFOLIO_KEYWORD_POOL.keys()}
            search_text = (text + " " + (bill.get("title") or "") + " " + (intel.get("summary") or "")).lower()
            
            for cat, keywords in PORTFOLIO_KEYWORD_POOL.items():
                for kw in keywords:
                    if kw in search_text:
                        scores[cat] += search_text.count(kw)
            
            best_cat = max(scores, key=scores.get)
            if scores[best_cat] > 0:
                logger.info(f"    → AI Checker assigned: {best_cat} (Score: {scores[best_cat]})")
                update_data["category"] = best_cat
            else:
                update_data["category"] = "Governance" # Default to Governance if no hits

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        if update_data:
            update_data_clean = {k: v for k, v in update_data.items() if v is not None}
            self.db.update("bills", update_data_clean, eq="id", eq_val=bill_id)
        return update_data

    def process_bill(self, bill: Dict[str, Any]):
        """Full upgrade cycle for a single bill."""
        bill_id = bill["id"]
        title = bill.get("title", "Untitled")
        logger.info(f"  ▶ [{title[:60]}]")

        # Step 1: PDF Re-Extraction (only if text_content is missing)
        text = bill.get("text_content") or ""
        if not text or len(text) < 100:
            pdf_url = bill.get("pdf_url") or bill.get("url", "")
            if pdf_url:
                logger.info(f"    [1/3] No text — extracting from PDF: {pdf_url[:80]}")
                text = extract_pdf_text(pdf_url)
                if text and len(text) >= 100:
                    logger.info(f"    → Extracted {len(text)} chars.")
                    self.stats["pdf_extracted"] += 1
                else:
                    logger.info("    → PDF extraction empty. Proceeding with title-only mode.")
        else:
            logger.info(f"    [1/3] Text present ({len(text)} chars). Skipping re-extraction.")

        # Inject fresh text into bill dict for prompt context
        bill_with_text = dict(bill)
        if text:
            bill_with_text["text_content"] = text

        # Step 2: Sovereign Mesh Distillation
        logger.info("    [2/3] Running Sovereign Mesh AI Distillation...")
        intel = {}
        if self.orchestrator:
            try:
                intel = self._run_ai_distillation(bill_with_text) or {}
                if intel:
                    self.stats["ai_filled"] += 1
                    logger.info("    → Distillation SUCCESS.")
                else:
                    logger.warning("    → Distillation returned empty. Proceeding with partial patch.")
            except Exception as e:
                logger.error(f"    → Distillation ERROR: {e}")

        # Step 3: Atomic Patch (Preservation-First)
        logger.info("    [3/3] Applying atomic PATCH to database...")
        try:
            patched = self._atomic_patch(bill_id, intel, bill, text)
            if patched:
                logger.info(f"    ✅ Patched {len(patched)} fields.")
                self.stats["upgraded"] += 1
            else:
                logger.info("    → No new fields to patch. Bill already at full density.")
                self.stats["skipped"] += 1
        except Exception as e:
            logger.error(f"    ❌ Patch failed: {e}")
            self.stats["failed"] += 1

    def run(self, limit: Optional[int] = None, target_id: Optional[str] = None):
        """Main Phase A sweep entry point."""
        logger.info("=" * 70)
        logger.info("🚀 SOVEREIGN REFRESH — PHASE A INITIATED")
        logger.info(f"   Time (EAT): {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"   Mode: {'FORCE (all bills)' if self.force else 'NULL-FILL ONLY'}")
        if target_id:
            logger.info(f"   Target: {target_id}")
        logger.info("=" * 70)

        bills = self._fetch_all_bills(limit=limit, target_id=target_id)
        self.stats["total"] = len(bills)

        if not bills:
            logger.warning("No bills found. Run the legislative_scraper.py first.")
            return

        for i, bill in enumerate(bills):
            logger.info(f"\n[{i+1}/{len(bills)}] Processing bill ID: {bill['id'][:8]}...")
            if not self._needs_upgrade(bill):
                logger.info("    → Full data density already reached. Skipping.")
                self.stats["skipped"] += 1
                continue
            try:
                self.process_bill(bill)
                time.sleep(1.2)  # Rate limit: protect Parliament PDF servers + API providers
            except Exception as e:
                logger.error(f"❌ Unhandled error on '{bill.get('title')}': {e}")
                self.stats["failed"] += 1

            if (i + 1) % 10 == 0:
                logger.info(
                    f"\n📊 Progress [{i+1}/{len(bills)}] — "
                    f"Upgraded: {self.stats['upgraded']} | "
                    f"Skipped: {self.stats['skipped']} | "
                    f"Failed: {self.stats['failed']}"
                )

        logger.info("\n" + "=" * 70)
        logger.info("🏁 PHASE A — SOVEREIGN REFRESH COMPLETE")
        logger.info(f"   Total Bills: {self.stats['total']}")
        logger.info(f"   Upgraded:    {self.stats['upgraded']}")
        logger.info(f"   PDF Fetched: {self.stats['pdf_extracted']}")
        logger.info(f"   AI Filled:   {self.stats['ai_filled']}")
        logger.info(f"   Skipped:     {self.stats['skipped']}")
        logger.info(f"   Failed:      {self.stats['failed']}")
        logger.info("=" * 70)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase A: Sovereign Refresh — Non-destructive bill intelligence upgrade.")
    parser.add_argument("--limit", type=int, default=None, help="Process only N bills (for testing).")
    parser.add_argument("--force", action="store_true", help="Force re-process ALL bills, even those with complete data.")
    parser.add_argument("--target_id", type=str, default=None, help="Target a specific bill UUID for patching.")
    args = parser.parse_args()

    refresher = SovereignRefresh(force=args.force)
    refresher.run(limit=args.limit, target_id=args.target_id)
