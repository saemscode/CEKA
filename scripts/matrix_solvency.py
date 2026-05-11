"""
matrix_solvency.py — Phase B: Sovereign Matrix Solvency (Surgical Mini-Full Runs)
====================================================================================
PURPOSE:
    After Phase A (sovereign_refresh.py) has done the broad sweep, this script
    runs as the surgical cleanup pass. It performs an exhaustive 30-column NULL
    audit of public.bills, then fires a full "Unit-Level Mini-Full Run" for every
    remaining NULL — treating each missing cell as a high-priority intel mission.

    For each missing cell, it activates the FULL 5-API Sovereign Mesh:
    - DeepSeek: Structural reasoning from the full bill row context
    - Groq: Instant stage detection from text snippets
    - Cerebras: Tabloid synthesis and citizen concern generation
    - Cohere: Constitutional article reranking
    - Manus: PDF hunter if all other download methods fail
    + Gemini + Sentinel Master Prompt as the synthesis backbone

    The atomic PATCH logic guarantees that ONLY the targeted NULL cell is written.
    No existing non-null data is ever overwritten.

USAGE:
    # Full Matrix Solvency run (ALL rows, ALL columns):
    python CEKA/scripts/matrix_solvency.py

    # Column Sweep Mode — fix ONE column across ALL bills:
    python CEKA/scripts/matrix_solvency.py --column constitutional_section

    # Row Full-Ham Mode — fix ALL nulls for ONE specific bill:
    python CEKA/scripts/matrix_solvency.py --bill-id <uuid>

    # Deep Surgical Mode — fix ONE specific cell (row × column intersection):
    python CEKA/scripts/matrix_solvency.py --bill-id <uuid> --column tabloid_summary

    # Dry run (audit only, no writes):
    python CEKA/scripts/matrix_solvency.py --dry-run

RUNS: Weekly (every Monday 08:00 EAT via GitHub Actions, AFTER sovereign_refresh.py)
"""

import os
import sys
import json
import logging
import time
import re
import argparse
import io
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
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
# Import pipeline dependencies
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
    from stage_detector import normalize_stage_label
    STAGES_OK = True
except ImportError:
    STAGES_OK = False

try:
    from cohere import Client as CohereClient
    COHERE_OK = True
except ImportError:
    COHERE_OK = False

try:
    from groq import Groq
    GROQ_OK = True
except ImportError:
    GROQ_OK = False

try:
    from cerebras.cloud.sdk import Cerebras
    CEREBRAS_OK = True
except ImportError:
    CEREBRAS_OK = False

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [MATRIX-SOLVENCY] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("matrix_solvency.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# The 30-Column Audit Matrix
# Each entry: (column_name, null_check_type, responsible_organ)
# null_check_type: "null" | "empty_str" | "default_val" | "empty_list"
# responsible_organ: which specialized API/method handles this column
# ---------------------------------------------------------------------------
COLUMN_AUDIT_MATRIX = [
    # Intelligence columns
    ("neural_summary",         "null",        "mesh_full"),
    ("tabloid_summary",        "null",        "cerebras"),
    ("ai_concerns",            "empty_list",  "cerebras"),
    ("constitutional_section", "null",        "cohere"),
    ("corroboration_score",    "null",        "mesh_full"),

    # Structural extraction columns
    ("sponsor",                "default_val", "memorandum_scan"),   # "Government" = needs fix
    ("sponsor_title",          "null",        "memorandum_scan"),
    ("summary",                "null",        "mesh_full"),
    ("description",            "null",        "mesh_full"),
    ("neural_summary",         "null",        "mesh_full"),

    # Legislative tracking columns
    ("status",                 "null",        "groq_stage"),
    ("bill_no",                "null",        "regex_extract"),
    ("gazette_no",             "null",        "regex_extract"),
    ("session_year",           "null",        "regex_extract"),
    ("house",                  "null",        "regex_extract"),
    ("date",                   "null",        "regex_extract"),

    # Boolean classification columns
    ("is_money_bill",          "null",        "mesh_full"),
    ("concerns_counties",      "null",        "mesh_full"),

    # Source and text columns
    ("text_content",           "null",        "pdf_hunter"),
    ("pdf_url",                "null",        "manus_hunter"),
    ("url",                    "null",        "manus_hunter"),

    # Metadata columns
    ("category",               "null",        "regex_extract"),
    ("analysis_status",        "null",        "auto_complete"),
    ("stages",                 "null",        "mesh_full"),
    ("verified_sources",       "empty_list",  "mesh_full"),
]

# Flatten to just column names for quick lookup
ALL_MONITORED_COLS = list(dict.fromkeys([c[0] for c in COLUMN_AUDIT_MATRIX]))

# Regex patterns for structural fields
BILL_NO_PATTERN  = re.compile(r'(?:No\.?\s*|Number\s*)(\d+)\s+of\s+(20\d{2})', re.IGNORECASE)
GAZETTE_PATTERN  = re.compile(r'Kenya\s+Gazette\s+(?:Supplement\s+)?No\.?\s*(\d+)', re.IGNORECASE)
YEAR_PATTERN     = re.compile(r'\b(20\d{2})\b')
HOUSE_PATTERNS   = [
    (re.compile(r'\b(SENATE|Senate\s+Bill)', re.IGNORECASE), "Senate"),
    (re.compile(r'\b(National\s+Assembly|NA\s+Bill)', re.IGNORECASE), "National Assembly"),
]
STAGE_PATTERNS = [
    (r'\bPRESIDENTIAL\s+ASSENT\b', "Presidential Assent"),
    (r'\bSIGNED\s+INTO\s+LAW\b', "Made into Law"),
    (r'\bACT\s+NO\b', "Made into Law"),
    (r'\bTHIRD\s+READING\b', "Third Reading"),
    (r'\b3RD\s+READING\b', "Third Reading"),
    (r'\bCOMMITTEE\s+STAGE\b', "Committee Stage"),
    (r'\bSECOND\s+READING\b', "Second Reading"),
    (r'\b2ND\s+READING\b', "Second Reading"),
    (r'\bFIRST\s+READING\b', "First Reading"),
    (r'\b1ST\s+READING\b', "First Reading"),
    (r'\bNEGATIVED\b', "Negatived"),
    (r'\bWITHDRAWN\b', "Withdrawn"),
    (r'\bFORWARDED\b', "Forwarded"),
    (r'\bPUBLISHED\b', "Publication"),
]
MEMORANDUM_MARKER = "MEMORANDUM OF OBJECTS AND REASONS"

# ---------------------------------------------------------------------------
# Sentinel Master Prompt Loader
# ---------------------------------------------------------------------------
def load_sentinel_prompt() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "context", "CEKA-AI-Prompt.md")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    return (
        "You are CEKA's Sovereign Legislative Intelligence Engine for Kenya. "
        "You are precise, factual, and anchored in the Constitution of Kenya 2010. "
        "Return ONLY valid JSON. No markdown fences. No commentary."
    )

# ---------------------------------------------------------------------------
# PDF Extraction Cascade
# ---------------------------------------------------------------------------
def _extract_pdf_text(pdf_url: str) -> str:
    """Downloads and extracts text from a PDF using the full cascade."""
    if not pdf_url or not pdf_url.lower().endswith(".pdf"):
        return ""
    try:
        r = requests.get(pdf_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            return ""
        content = r.content

        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = "\n".join(p.extract_text() or "" for p in pdf.pages)
            if text and len(text) >= 50:
                return text
        except Exception:
            pass

        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
            if text and len(text) >= 50:
                return text
        except Exception:
            pass

        try:
            import pytesseract
            from pdf2image import convert_from_bytes
            pages = convert_from_bytes(
                content, dpi=300,
                poppler_path=_POPPLER if os.path.isdir(_POPPLER) else None
            )
            text = "\n".join(pytesseract.image_to_string(p) for p in pages)
            if text and len(text) >= 50:
                return text
        except Exception as e:
            logger.warning(f"    → OCR failed: {e}")
    except Exception as e:
        logger.warning(f"    → PDF fetch failed: {e}")
    return ""

# ---------------------------------------------------------------------------
# Manus Agentic Hunter
# ---------------------------------------------------------------------------
def _manus_hunt(goal: str) -> Optional[str]:
    """Triggers the Manus Agentic API to hunt for a PDF or URL."""
    manus_key = os.getenv("MANUS_API_KEY", "")
    if not manus_key:
        return None
    try:
        headers = {"Authorization": f"Bearer {manus_key}", "Content-Type": "application/json"}
        payload = {"goal": goal, "max_steps": 5}
        res = requests.post("https://api.manus.ai/v1/execute", headers=headers, json=payload, timeout=90)
        if res.status_code == 200:
            return res.json().get("result")
    except Exception as e:
        logger.warning(f"    → Manus Agent failed: {e}")
    return None

# ---------------------------------------------------------------------------
# Regex Structural Extraction
# ---------------------------------------------------------------------------
def _regex_extract_structural(text: str, title: str, col: str) -> Optional[Any]:
    """Extracts structural fields (bill_no, gazette_no, year, house) via regex."""
    source = (text or "") + " " + (title or "")

    if col == "bill_no":
        m = BILL_NO_PATTERN.search(source)
        return f"No. {m.group(1)} of {m.group(2)}" if m else None

    if col == "gazette_no":
        m = GAZETTE_PATTERN.search(source)
        return m.group(1) if m else None

    if col == "session_year":
        m = YEAR_PATTERN.search(source)
        return int(m.group(1)) if m else None

    if col == "house":
        for pattern, house_name in HOUSE_PATTERNS:
            if pattern.search(source):
                return house_name
        return None

    if col == "date":
        dm = re.search(r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b', source, re.IGNORECASE)
        if dm:
            try:
                from datetime import date
                from dateutil import parser as dparser
                return dparser.parse(dm.group(0)).date().isoformat()
            except Exception:
                pass
        return None

    if col == "category":
        if re.search(r'\bSENATE\b', source, re.IGNORECASE):
            return "Senate Bill"
        if re.search(r'\bNATIONAL\s+ASSEMBLY\b', source, re.IGNORECASE):
            return "National Assembly Bill"
        return "Bill"

    return None

# ---------------------------------------------------------------------------
# Memorandum-Centric Sponsor Scan
# ---------------------------------------------------------------------------
def _memorandum_sponsor_scan(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Scans the full text for the MEMORANDUM OF OBJECTS AND REASONS block.
    Extracts the sponsor name and title from the 3,500-char window after it.
    Returns (sponsor_name, sponsor_title).
    """
    if not text:
        return None, None

    idx = text.upper().find(MEMORANDUM_MARKER)
    if idx == -1:
        return None, None

    window = text[idx: idx + 3500]

    # Interpretation zone disqualification: skip if "means" in close proximity
    # (definitions sections masquerading as sponsor names)
    name_match = re.search(
        r'(?:PREPARED|INTRODUCED|SUBMITTED|TABLED|MOVED)\s+BY\s+([A-Z][A-Za-z\s\-\.]+?)(?:\n|,|\.)',
        window
    )
    if name_match:
        candidate = name_match.group(1).strip()
        if "means" not in candidate.lower() and len(candidate) < 80:
            title_match = re.search(r'(HON\.|CABINET\s+SECRETARY|SENATOR|MP|C\.S\.|PS\.)', window[:500], re.IGNORECASE)
            title = title_match.group(0).strip() if title_match else None
            return candidate, title

    # Fallback: "Dated at Nairobi / Signed" pattern
    dated_match = re.search(
        r'(?:Dated|Signed)\s+(?:at\s+\w+)?\s*,?\s*this\s+[\d\w]+\s+day[^.]{0,100}\n\s*([A-Z][A-Za-z\s\-\.]+?)\n',
        window
    )
    if dated_match:
        candidate = dated_match.group(1).strip()
        if "means" not in candidate.lower() and len(candidate) < 80:
            return candidate, None

    return None, None

# ---------------------------------------------------------------------------
# Groq Stage Watchdog
# ---------------------------------------------------------------------------
def _groq_stage_detect(text_snippet: str) -> Optional[str]:
    """Uses Groq for instant single-pass stage detection."""
    if not GROQ_OK:
        return None
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key or not text_snippet:
        return None
    try:
        client = Groq(api_key=groq_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a Kenyan parliamentary stage detector. Return ONLY one of: Publication, First Reading, Second Reading, Committee Stage, Third Reading, Presidential Assent, Made into Law, Negatived, Withdrawn, Unknown."},
                {"role": "user", "content": f"What is the current legislative stage of this bill?\n\n{text_snippet[:2000]}"},
            ],
            temperature=0.0,
            max_tokens=15,
        )
        stage = resp.choices[0].message.content.strip()
        return stage if stage != "Unknown" else None
    except Exception as e:
        logger.warning(f"    → Groq stage detect failed: {e}")
        return None

# ---------------------------------------------------------------------------
# Cerebras Tabloid + Concerns Synthesizer
# ---------------------------------------------------------------------------
def _cerebras_synthesize(bill_context: str) -> Dict[str, Any]:
    """Uses Cerebras for high-throughput tabloid + citizen concerns generation."""
    if not CEREBRAS_OK:
        return {}
    cerebras_key = os.getenv("CEREBRAS_API_KEY", "")
    if not cerebras_key:
        return {}
    try:
        client = Cerebras(api_key=cerebras_key)
        resp = client.chat.completions.create(
            model="llama3.1-70b",
            messages=[
                {"role": "system", "content": "You are a Kenyan civic journalist. Return ONLY valid JSON with keys: tabloid_summary (ONE punchy sentence, max 30 words) and ai_concerns (array of 3-5 plain English strings about citizen impact)."},
                {"role": "user", "content": f"Analyze this Kenyan bill context and generate the required output:\n\n{bill_context[:6000]}"},
            ],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        return json.loads(raw) if raw else {}
    except Exception as e:
        logger.warning(f"    → Cerebras synthesis failed: {e}")
        return {}

# ---------------------------------------------------------------------------
# Cohere Constitutional Reranker
# ---------------------------------------------------------------------------
def _cohere_rerank(db: "SupabaseDirect", title: str, summary: str) -> str:
    """Uses Cohere Rerank to map the bill to Constitution of Kenya articles."""
    if not COHERE_OK:
        return ""
    cohere_key = os.getenv("COHERE_API_KEY", "")
    if not cohere_key:
        return ""
    try:
        client = CohereClient(cohere_key)
        res = db.select("constitution_articles", "clause_ref,content", limit=80)
        docs = [f"[{d['clause_ref']}]: {d['content']}" for d in (res or [])]
        if not docs:
            return ""
        rerank = client.rerank(
            query=f"{title} {summary}",
            documents=docs,
            top_n=5,
            model="rerank-english-v3.0"
        )
        selected = [docs[hit.index] for hit in rerank.results]
        refs = re.findall(r'\[([^\]]+)\]', "\n".join(selected))
        return ", ".join(refs[:5]) if refs else ""
    except Exception as e:
        logger.warning(f"    → Cohere Rerank failed: {e}")
        return ""

# ---------------------------------------------------------------------------
# Full Mesh Mini-Full Run (for complex columns)
# ---------------------------------------------------------------------------
def _mesh_full_distillation(orchestrator: "MultiLLMOrchestrator",
                             sentinel_prompt: str,
                             bill: Dict[str, Any],
                             target_col: str) -> Optional[Any]:
    """
    Fires the full Multi-LLM Mesh for a single targeted column.
    Provides the entire row as context. Returns only the value for target_col.
    """
    if not orchestrator:
        return None

    title = bill.get("title", "Untitled")
    text = (bill.get("text_content") or "")[:10000]
    row_context = {
        k: v for k, v in bill.items()
        if v is not None and k not in ["id", "created_at", "updated_at", "text_content"]
    }

    mode = "FULL TEXT" if len(text) >= 100 else "METADATA-ONLY"
    prompt = f"""{sentinel_prompt}

---
MISSION: SURGICAL CELL FILL
TARGET COLUMN: {target_col}
BILL TITLE: {title}
MODE: {mode}

FULL ROW CONTEXT (all existing data for this bill — use as anchor):
{json.dumps(row_context, indent=2, default=str)}

BILL TEXT:
{text if text else "(No text available)"}

TASK:
Based on the existing row context and bill text above, generate ONLY the value for the column: "{target_col}".

Return a JSON object with a single key "{target_col}" containing the precise value.
Do not include any other fields.

COLUMN-SPECIFIC RULES:
- constitutional_section: comma-separated Articles from Constitution of Kenya 2010
- ai_concerns: JSON array of 3-5 plain English strings
- tabloid_summary: ONE sentence, max 30 words
- is_money_bill: true or false
- concerns_counties: true or false
- corroboration_score: integer 0-100
- sponsor: exact name, never 'Government' unless truly a Government Bill with no named sponsor
- neural_summary: 2-paragraph legal analysis
- summary: 3-5 sentence policy summary
- status: One of: Publication, First Reading, Second Reading, Committee Stage, Third Reading, Presidential Assent, Made into Law, Negatived, Withdrawn
"""

    raw = orchestrator.synthesize(prompt, system_prompt="")
    if not raw:
        return None
    intel = orchestrator.extract_json(raw)
    if not intel:
        return None
    return intel.get(target_col)

# ---------------------------------------------------------------------------
# NULL Audit Function
# ---------------------------------------------------------------------------
def _is_null(bill: Dict[str, Any], col: str, null_type: str) -> bool:
    """Check if a specific column is considered 'null' per its null_type."""
    val = bill.get(col)
    if null_type == "null":
        return val is None or val == ""
    if null_type == "empty_str":
        return not val or str(val).strip() == ""
    if null_type == "empty_list":
        if val is None:
            return True
        if isinstance(val, list):
            return len(val) == 0
        if isinstance(val, str):
            try:
                parsed = json.loads(val)
                return isinstance(parsed, list) and len(parsed) == 0
            except Exception:
                return val.strip() in ("", "[]", "null")
        return True
    if null_type == "default_val":
        # For sponsor: "Government" counts as a missing/default value
        if col == "sponsor":
            return val is None or val == "" or val == "Government"
        return val is None
    return val is None

# ---------------------------------------------------------------------------
# SovereignMatrixSolvency — Phase B
# ---------------------------------------------------------------------------
class SovereignMatrixSolvency:
    """
    Phase B: Surgical Matrix Solvency.
    Iterates the full 30-column audit matrix and fires Mini-Full Runs
    for every remaining NULL cell after Phase A has completed.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        if not DB_OK:
            raise ImportError("supabase_direct.py not found.")
        self.db = SupabaseDirect()
        logger.info("✅ SupabaseDirect connected.")

        self.sentinel_prompt = load_sentinel_prompt()

        self.orchestrator = MultiLLMOrchestrator() if ORCH_OK else None
        if self.orchestrator:
            logger.info("✅ Multi-LLM Orchestrator (10-provider chain) ready.")
        else:
            logger.warning("⚠️ MultiLLMOrchestrator unavailable.")

        self.stats = {
            "total_bills": 0,
            "total_cells_audited": 0,
            "cells_filled": 0,
            "cells_skipped": 0,
            "cells_failed": 0,
            "manus_hunts": 0,
            "pdf_fetches": 0,
        }

    def _fetch_bills(self, bill_id: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        columns = (
            "id,title,url,pdf_url,text_content,status,sponsor,sponsor_title,"
            "summary,description,neural_summary,tabloid_summary,ai_concerns,"
            "constitutional_section,corroboration_score,is_money_bill,"
            "concerns_counties,bill_no,gazette_no,session_year,house,date,"
            "category,stages,analysis_status,verified_sources,history"
        )
        if bill_id:
            res = self.db.select("bills", columns, eq="id", eq_val=bill_id)
        else:
            res = self.db.select("bills", columns, limit=limit)
        return res or []

    def _ensure_text(self, bill: Dict[str, Any]) -> str:
        """Ensures the bill has text content — fetches from PDF if missing."""
        text = bill.get("text_content") or ""
        if len(text) >= 100:
            return text

        # Try PDF URL
        pdf_url = bill.get("pdf_url") or ""
        if pdf_url:
            logger.info(f"      [PDF-FETCH] Attempting: {pdf_url[:80]}")
            text = _extract_pdf_text(pdf_url)
            if text and len(text) >= 100:
                self.stats["pdf_fetches"] += 1
                if not self.dry_run:
                    self.db.update("bills", {
                        "text_content": text[:50000],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }, eq="id", eq_val=bill["id"])
                return text

        # Fallback: Manus Agent hunter
        if not text:
            manus_goal = f"Find and retrieve the full Kenyan parliamentary bill text for: {bill.get('title')}. The original PDF URL was: {pdf_url}"
            logger.info("      [MANUS-HUNT] Triggering agentic PDF hunt...")
            manus_result = _manus_hunt(manus_goal)
            if manus_result:
                self.stats["manus_hunts"] += 1
                return manus_result

        return text

    def _fill_cell(self, bill: Dict[str, Any], col: str, null_type: str, organ: str) -> Optional[Any]:
        """
        Mini-Full Run for a single cell. Routes to the correct specialized organ.
        Returns the computed value, or None if it couldn't be determined.
        """
        title = bill.get("title", "Unknown")
        text = self._ensure_text(bill)
        bill_context = f"Title: {title}\nSummary: {bill.get('summary','')}\nText: {text[:6000]}"

        # === ORGAN ROUTING ===

        if organ == "pdf_hunter":
            # text_content is filled by _ensure_text() above — return it directly
            return text if len(text) >= 100 else None

        if organ == "manus_hunter":
            # url or pdf_url is missing — use Manus to find it
            goal = f"Find the official parliamentary PDF download URL for this Kenyan bill: {title}"
            result = _manus_hunt(goal)
            return result

        if organ == "auto_complete":
            # analysis_status — if we can confirm any intelligence exists, mark completed
            has_intel = bill.get("neural_summary") or bill.get("summary") or bill.get("tabloid_summary")
            return "completed" if has_intel else "pending"

        if organ == "regex_extract":
            return _regex_extract_structural(text, title, col)

        if organ == "memorandum_scan":
            sponsor, sponsor_title = _memorandum_sponsor_scan(text)
            if col == "sponsor":
                return sponsor
            if col == "sponsor_title":
                return sponsor_title
            return None

        if organ == "groq_stage":
            stage = _groq_stage_detect(text[:2000])
            if not stage:
                # 12-pattern dict fallback
                for pattern, stage_name in STAGE_PATTERNS:
                    if re.search(pattern, text.upper()):
                        stage = stage_name
                        break
            if stage and STAGES_OK:
                stage = normalize_stage_label(stage)
            return stage

        if organ == "cerebras":
            result = _cerebras_synthesize(bill_context)
            if not result:
                # Fallback to full mesh
                return _mesh_full_distillation(self.orchestrator, self.sentinel_prompt, bill, col)
            return result.get(col)

        if organ == "cohere":
            # constitutional_section: use Cohere Rerank
            summary = bill.get("summary") or bill.get("neural_summary") or title
            result = _cohere_rerank(self.db, title, summary)
            if result:
                return result
            # Fallback: full mesh
            return _mesh_full_distillation(self.orchestrator, self.sentinel_prompt, bill, col)

        if organ == "mesh_full":
            return _mesh_full_distillation(self.orchestrator, self.sentinel_prompt, bill, col)

        return None

    def _atomic_write(self, bill_id: str, col: str, value: Any):
        """Writes a single cell to the database (Atomic PATCH)."""
        if value is None:
            return False

        write_val = value
        # Serialize lists to JSON string for JSONB columns
        if col in ("ai_concerns", "verified_sources") and isinstance(value, list):
            write_val = json.dumps(value)

        update_data = {
            col: write_val,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if not self.dry_run:
            self.db.update("bills", update_data, eq="id", eq_val=bill_id)
            return True
        else:
            logger.info(f"      [DRY-RUN] Would write: {col} = {str(write_val)[:80]}")
            return True

    def process_bill_matrix(self, bill: Dict[str, Any], target_col: Optional[str] = None):
        """
        Audits and fills all NULL cells for a single bill.
        If target_col is specified, only that column is processed.
        """
        bill_id = bill["id"]
        title = bill.get("title", "Untitled")

        # Build the column list for this run
        if target_col:
            col_matrix = [(col, nt, organ) for (col, nt, organ) in COLUMN_AUDIT_MATRIX if col == target_col]
        else:
            # Deduplicate: process each column once
            seen = set()
            col_matrix = []
            for row in COLUMN_AUDIT_MATRIX:
                if row[0] not in seen:
                    col_matrix.append(row)
                    seen.add(row[0])

        for (col, null_type, organ) in col_matrix:
            self.stats["total_cells_audited"] += 1

            if not _is_null(bill, col, null_type):
                self.stats["cells_skipped"] += 1
                continue  # Cell already has data — SKIP

            logger.info(f"      → NULL detected: [{col}] | Organ: [{organ}]")
            try:
                value = self._fill_cell(bill, col, null_type, organ)
                if value is not None and value != "" and value != [] and value != "Unknown":
                    written = self._atomic_write(bill_id, col, value)
                    if written:
                        logger.info(f"      ✅ [{col}] filled: {str(value)[:80]}")
                        self.stats["cells_filled"] += 1
                        # Update local bill dict so subsequent organs see this cell as filled
                        bill[col] = value
                    else:
                        self.stats["cells_skipped"] += 1
                else:
                    logger.warning(f"      ⚠️ [{col}] organ returned no usable value.")
                    self.stats["cells_failed"] += 1

                time.sleep(0.3)  # Intra-bill rate limit

            except Exception as e:
                logger.error(f"      ❌ [{col}] fill error: {e}")
                self.stats["cells_failed"] += 1

    def run(self,
            bill_id: Optional[str] = None,
            target_col: Optional[str] = None,
            limit: Optional[int] = None):
        """
        Main Phase B entry point.
        Modes:
          - All bills, all cols:        run()
          - Column sweep:               run(target_col="constitutional_section")
          - Row Full-Ham:               run(bill_id="<uuid>")
          - Deep Surgical Intersection: run(bill_id="<uuid>", target_col="tabloid_summary")
        """
        mode_label = "FULL MATRIX"
        if bill_id and target_col:
            mode_label = f"DEEP SURGICAL: bill={bill_id[:8]} × col={target_col}"
        elif bill_id:
            mode_label = f"ROW FULL-HAM: bill={bill_id[:8]}"
        elif target_col:
            mode_label = f"COLUMN SWEEP: {target_col}"

        logger.info("=" * 70)
        logger.info("🔬 MATRIX SOLVENCY — PHASE B INITIATED")
        logger.info(f"   Mode: {mode_label}")
        logger.info(f"   Dry Run: {self.dry_run}")
        logger.info(f"   Time (EAT): {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)

        bills = self._fetch_bills(bill_id=bill_id, limit=limit)
        self.stats["total_bills"] = len(bills)

        if not bills:
            logger.warning("No bills found for Phase B. Exiting.")
            return

        for i, bill in enumerate(bills):
            logger.info(f"\n[{i+1}/{len(bills)}] Bill: {bill.get('title','?')[:60]} (ID: {bill['id'][:8]}...)")
            try:
                self.process_bill_matrix(bill, target_col=target_col)
                time.sleep(1.0)  # Inter-bill rate limit
            except Exception as e:
                logger.error(f"❌ Unhandled error on '{bill.get('title')}': {e}")
                self.stats["cells_failed"] += 1

            if (i + 1) % 10 == 0 or (i + 1) == len(bills):
                logger.info(
                    f"\n📊 Progress [{i+1}/{len(bills)}] — "
                    f"Cells Filled: {self.stats['cells_filled']} | "
                    f"Cells Failed: {self.stats['cells_failed']} | "
                    f"PDF Fetches: {self.stats['pdf_fetches']} | "
                    f"Manus Hunts: {self.stats['manus_hunts']}"
                )

        logger.info("\n" + "=" * 70)
        logger.info("🏁 PHASE B — MATRIX SOLVENCY COMPLETE")
        logger.info(f"   Total Bills:       {self.stats['total_bills']}")
        logger.info(f"   Cells Audited:     {self.stats['total_cells_audited']}")
        logger.info(f"   Cells Filled:      {self.stats['cells_filled']}")
        logger.info(f"   Cells Skipped:     {self.stats['cells_skipped']}")
        logger.info(f"   Cells Failed:      {self.stats['cells_failed']}")
        logger.info(f"   PDF Re-Fetches:    {self.stats['pdf_fetches']}")
        logger.info(f"   Manus Hunts:       {self.stats['manus_hunts']}")
        logger.info("=" * 70)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Phase B: Sovereign Matrix Solvency — surgical cell-level NULL elimination."
    )
    parser.add_argument(
        "--bill-id", type=str, default=None,
        help="Target a specific bill by UUID (Row Full-Ham Mode)."
    )
    parser.add_argument(
        "--column", type=str, default=None,
        help=f"Target a specific column across all bills (Column Sweep Mode). Options: {', '.join(ALL_MONITORED_COLS)}"
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limit the number of bills processed (for testing)."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Audit and log NULLs without writing anything to the database."
    )
    args = parser.parse_args()

    # Validate column argument
    if args.column and args.column not in ALL_MONITORED_COLS:
        logger.error(f"Unknown column: '{args.column}'. Valid: {', '.join(ALL_MONITORED_COLS)}")
        sys.exit(1)

    engine = SovereignMatrixSolvency(dry_run=args.dry_run)
    engine.run(
        bill_id=args.bill_id,
        target_col=args.column,
        limit=args.limit,
    )
