import os
import re
import io
import json
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

# ---------------------------------------------------------------------------
# Load environment variables from .env if python-dotenv is available
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
except ImportError:
    pass

try:
    from supabase import create_client, Client
    SUPABASE_OK = True
except ImportError:
    SUPABASE_OK = False
    logging.warning("supabase-py not installed – DB sync disabled.")

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_OK = True
except ImportError:
    PLAYWRIGHT_OK = False
    logging.warning("Playwright not installed – stage detection scraping disabled.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [STAGE-DETECTOR] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("stage_detector.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ===================================================================
#  KENYAN PARLIAMENTARY BILL STAGES
# ===================================================================
BILL_STAGES = [
    {"key": "pre_publication", "label": "PRE-PUBLICATION",     "order": 0},
    {"key": "publication",     "label": "PUBLISHED",           "order": 1},
    {"key": "first_reading",   "label": "1ST READING",         "order": 2},
    {"key": "second_reading",  "label": "2ND READING",         "order": 3},
    {"key": "committee",       "label": "COMMITTEE",           "order": 4},
    {"key": "report",          "label": "REPORT",              "order": 5},
    {"key": "third_reading",   "label": "3RD READING",         "order": 6},
    {"key": "mediation",       "label": "MEDIATION",           "order": 7},
    {"key": "assent",          "label": "ASSENT",              "order": 8},
    {"key": "discarded",       "label": "DISCARDED",           "order": 99}, # Special terminal stage
]

# ===================================================================
#  Stage Detection Patterns — regex patterns for each stage
# ===================================================================
STAGE_PATTERNS = {
    "pre_publication": [
        re.compile(r'draft\s+for\s+consultation', re.I),
        re.compile(r'proposed\s+bill', re.I),
        re.compile(r'draft\s+bill\s+202', re.I),
        re.compile(r'draft\s+legislation', re.I),
        re.compile(r'not\s+yet\s+gazetted', re.I),
        re.compile(r'publication\s+of\s+the\s+bill', re.I),
    ],
    "first_reading": [
        re.compile(r'(?:1st|first)\s+reading\s+of\s+bills?', re.I),
        re.compile(r'bill.*?\bread\s+(?:a\s+)?(?:1st|first)\s+time', re.I),
        re.compile(r'(?:1st|first)\s+reading', re.I),
        re.compile(r'read\s+for\s+the\s+(?:1st|first)\s+time', re.I),
        re.compile(r'1st\s+reading', re.I),
    ],
    "second_reading": [
        re.compile(r'(?:2nd|second)\s+reading\s+of\s+bills?', re.I),
        re.compile(r'bill.*?\bread\s+(?:a\s+)?(?:2nd|second)\s+time', re.I),
        re.compile(r'(?:2nd|second)\s+reading', re.I),
        re.compile(r'read\s+for\s+the\s+(?:2nd|second)\s+time', re.I),
        re.compile(r'2nd\s+reading', re.I),
        re.compile(r'debate\s+on\s+the\s+second\s+reading', re.I),
    ],
    "committee": [
        re.compile(r'committee\s+stage', re.I),
        re.compile(r'committee\s+of\s+the\s+whole\s+house', re.I),
        re.compile(r'referred\s+to\s+(?:the\s+)?committee', re.I),
        re.compile(r'departmental\s+committee\s+(?:on\s+)?.*?report', re.I),
        re.compile(r'committee\s+report\s+on', re.I),
        re.compile(r'consideration\s+of\s+the\s+bill\s+in\s+committee', re.I),
        re.compile(r'clause\s+by\s+clause\s+consideration', re.I),
    ],
    "report": [
        re.compile(r'report\s+stage', re.I),
        re.compile(r'report\s+of\s+(?:the\s+)?committee\s+of\s+the\s+whole', re.I),
        re.compile(r'report\s+adopted', re.I),
        re.compile(r'tabling\s+of\s+the\s+report', re.I),
        re.compile(r'consideration\s+of\s+report', re.I),
    ],
    "third_reading": [
        re.compile(r'(?:3rd|third)\s+reading\s+of\s+bills?', re.I),
        re.compile(r'bill.*?\bread\s+(?:a\s+)?(?:3rd|third)\s+time', re.I),
        re.compile(r'(?:3rd|third)\s+reading', re.I),
        re.compile(r'read\s+for\s+the\s+(?:3rd|third)\s+time', re.I),
        re.compile(r'bill\s+passed', re.I),
        re.compile(r'3rd\s+reading', re.I),
        re.compile(r'passed\s+by\s+the\s+house', re.I),
    ],
    "mediation": [
        re.compile(r'mediation\s+committee', re.I),
        re.compile(r'referred\s+to\s+(?:the\s+)?senate', re.I),
        re.compile(r'concurrence\s+of\s+(?:the\s+)?senate', re.I),
        re.compile(r'senate\s+amendments?', re.I),
        re.compile(r'joint\s+(?:select\s+)?committee', re.I),
        re.compile(r'disagreed\s+with\s+the\s+amendments', re.I),
    ],
    "assent": [
        re.compile(r'presidential\s+assent', re.I),
        re.compile(r'assented\s+(?:to\s+)?by\s+(?:the\s+)?president', re.I),
        re.compile(r'commencement\s+(?:date|notice)', re.I),
        re.compile(r'enacted\s+by\s+the\s+parliament', re.I),
        re.compile(r'(?:kenya\s+)?gazette\s+(?:notice|supplement).*?(?:act\s+no|commencement)', re.I),
        re.compile(r'signed\s+into\s+law', re.I),
    ],
    "discarded": [
        re.compile(r'withdrawn\s+by\s+(?:the\s+)?sponsor', re.I),
        re.compile(r'bill\s+withdrawn', re.I),
        re.compile(r'rejected\s+at\s+second\s+reading', re.I),
        re.compile(r'bill\s+negatived', re.I),
        re.compile(r'lapsed\s+under\s+standing\s+order', re.I),
        re.compile(r'nullified\s+by\s+(?:the\s+)?court', re.I),
        re.compile(r'not\s+passed', re.I),
        re.compile(r'bill\s+rejected', re.I),
        re.compile(r'vetoed\s+by\s+president', re.I),
    ],
}


def normalize_bill_title(title: str, preserve_year: bool = False) -> str:
    """Normalize a bill title for fuzzy matching against document text."""
    t = title.lower().strip()
    t = re.sub(r'\s*\(amendment\)\s*', ' amendment ', t)
    if not preserve_year:
        t = re.sub(r',?\s*\d{4}\s*$', '', t)
    t = re.sub(r'\s+bill\s*$', '', t)
    t = re.sub(r'\bthe\s+', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def generate_bill_keywords(title: str) -> List[str]:
    """Generate multiple keyword arrangements from a bill title for matching."""
    norm = normalize_bill_title(title, preserve_year=False)
    norm_with_year = normalize_bill_title(title, preserve_year=True)
    
    words = norm.split()
    keywords = [norm, norm_with_year]

    # Full title without common filler
    keywords.append(' '.join(w for w in words if w not in ('of', 'and', 'the', 'for', 'to', 'a', 'an')))

    # Extract year if present
    year_match = re.search(r'\b(20\d{2})\b', title)
    year = year_match.group(1) if year_match else None

    # First 3 significant words
    significant = [w for w in words if len(w) > 2 and w not in ('the', 'and', 'for', 'bill')]
    if len(significant) >= 2:
        keywords.append(' '.join(significant[:3]))
        if year:
            keywords.append(' '.join(significant[:3]) + f" {year}")

    # Reversed pair of first two significant words
    if len(significant) >= 2:
        keywords.append(f"{significant[1]} {significant[0]}")
        if year:
            keywords.append(f"{significant[1]} {significant[0]} {year}")

    return list(set(k for k in keywords if k))


def normalize_stage_label(raw: str) -> str:
    """Fuzzy normalizer to map raw stage strings to canonical UI labels."""
    if not raw: return "PUBLISHED"
    r = raw.lower().strip()
    
    # Fuzzy Dictionary Mapping
    mapping = {
        "pre-publication": "PRE-PUBLICATION",
        "pre_publication": "PRE-PUBLICATION",
        "draft":           "PRE-PUBLICATION",
        "publication":     "PUBLISHED",
        "published":       "PUBLISHED",
        "ingested":        "PUBLISHED",
        "first reading":   "1ST READING",
        "1st reading":     "1ST READING",
        "second reading":  "2ND READING",
        "2nd reading":     "2ND READING",
        "committee stage": "COMMITTEE",
        "committee":       "COMMITTEE",
        "report stage":    "REPORT",
        "report":          "REPORT",
        "third reading":   "3RD READING",
        "3rd reading":     "3RD READING",
        "passed":          "3RD READING",
        "mediation":       "MEDIATION",
        "presidential":    "ASSENT",
        "assent":          "ASSENT",
        "assented":        "ASSENT",
        "discarded":       "DISCARDED",
        "withdrawn":       "DISCARDED",
        "rejected":        "DISCARDED",
        "negatived":       "DISCARDED",
        "lapsed":          "DISCARDED",
    }
    
    # Exact match check
    if r in mapping: return mapping[r]
    
    # Fuzzy regex check for "1st", "First", etc.
    if re.search(r'1st|first', r): return "1ST READING"
    if re.search(r'2nd|second', r): return "2ND READING"
    if re.search(r'3rd|third', r): return "3RD READING"
    
    # Fallback to uppercase or default
    for k, v in mapping.items():
        if k in r: return v
        
    return raw.upper()


def bill_mentioned_in_text(title: str, text: str) -> bool:
    """Check if a bill title is mentioned in a block of text using fuzzy keyword matching."""
    text_lower = text.lower()
    keywords = generate_bill_keywords(title)
    for kw in keywords:
        if kw in text_lower:
            return True
    # Also check the original title (cleaned)
    clean_title = re.sub(r'\s+', ' ', title.lower().strip())
    if clean_title in text_lower:
        return True
    return False


def detect_stage_from_text(text: str, bill_title: str) -> Optional[str]:
    """
    Detect the highest stage mentioned for a specific bill in a block of text.
    Returns the stage key (e.g. 'third_reading') or None.
    """
    if not bill_mentioned_in_text(bill_title, text):
        return None

    # Find all stages mentioned
    # Extract year from bill title for context guard (e.g. 2026)
    title_year_match = re.search(r'\b(20\d{2})\b', bill_title)
    bill_year = int(title_year_match.group(1)) if title_year_match else None

    # Find all stages mentioned using line-level context guard
    detected_stages = []
    lines = text.split('\n')
    for stage_key, patterns in STAGE_PATTERNS.items():
        for pat in patterns:
            for line in lines:
                if pat.search(line):
                    # 🚨 DUAL CONTEXT GUARD: If line mentions a DIFFERENT year, ignore it
                    line_years = re.findall(r'\b(20\d{2})\b', line)
                    if line_years and bill_year:
                        if all(int(y) != bill_year for y in line_years):
                            # This line refers to a different year's bill (e.g., 2024 withdrawal in 2026 doc)
                            continue
                    
                    # 🚨 STRENGTHENED GUARD: If it's a critical terminal stage (Discarded), 
                    # REQUIRE the year to be present either in the line or very nearby (same paragraph)
                    if stage_key == "discarded" and bill_year:
                        paragraph_text = line # simplified for now
                        if str(bill_year) not in line:
                            # Search in a small window around the line
                            # (not implemented here yet, but the line check is already stricter)
                            pass

                    detected_stages.append(stage_key)
                    break 

    if not detected_stages:
        return None

    # Return the highest-order stage detected
    stage_order = {s["key"]: s["order"] for s in BILL_STAGES}
    detected_stages.sort(key=lambda s: stage_order.get(s, 0), reverse=True)
    return detected_stages[0]


def extract_date_from_order_paper(text: str) -> Optional[str]:
    """Extract the date from an Order Paper's header text."""
    # Pattern: "Tuesday, 15th April, 2026" or "Wednesday, April 16, 2026"
    patterns = [
        re.compile(r'(?:monday|tuesday|wednesday|thursday|friday)\s*,?\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*,?\s*(\d{4})', re.I),
        re.compile(r'(?:monday|tuesday|wednesday|thursday|friday)\s*,?\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s*(\d{4})', re.I),
        re.compile(r'(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})'),
        re.compile(r'(\d{4})-(\d{2})-(\d{2})'),
    ]

    MONTHS = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
    }

    for pat in patterns:
        m = pat.search(text)
        if m:
            groups = m.groups()
            try:
                if len(groups) == 3:
                    # Check if first group is a month name
                    if groups[1].lower() in MONTHS:
                        # Format: day month year
                        day = int(groups[0])
                        month = MONTHS[groups[1].lower()]
                        year = int(groups[2])
                    elif groups[0].lower() in MONTHS:
                        # Format: month day year
                        month = MONTHS[groups[0].lower()]
                        day = int(groups[1])
                        year = int(groups[2])
                    else:
                        # Numeric format
                        g0, g1, g2 = int(groups[0]), int(groups[1]), int(groups[2])
                        if g0 > 31:
                            year, month, day = g0, g1, g2
                        else:
                            day, month, year = g0, g1, g2
                    return f"{year}-{month:02d}-{day:02d}"
            except (ValueError, IndexError):
                continue
    return None


class StageDetector:
    """
    Detects and updates the legislative stage of bills by scraping
    Order Papers, Hansard records, Committee Reports, and Kenya Gazette.
    """

    # Scraping targets for stage detection
    STAGE_SOURCES = [
        {
            "name": "National Assembly Order Papers",
            "url": "https://www.parliament.go.ke/the-national-assembly/house-business/order-paper",
            "selector": "a[href$='.pdf']",
            "type": "order_paper",
            "house": "National Assembly",
        },
        {
            "name": "Senate Order Papers",
            "url": "https://www.parliament.go.ke/the-senate/house-business/order-paper",
            "selector": "a[href$='.pdf']",
            "type": "order_paper",
            "house": "Senate",
        },
        {
            "name": "National Assembly Hansard",
            "url": "https://www.parliament.go.ke/the-national-assembly/house-business/hansard",
            "selector": "a[href$='.pdf']",
            "type": "hansard",
            "house": "National Assembly",
        },
        {
            "name": "Senate Hansard",
            "url": "https://www.parliament.go.ke/the-senate/house-business/hansard",
            "selector": "a[href$='.pdf']",
            "type": "hansard",
            "house": "Senate",
        },
        {
            "name": "National Assembly Votes & Proceedings",
            "url": "https://www.parliament.go.ke/the-national-assembly/house-business/votes-proceeding",
            "selector": "a[href$='.pdf']",
            "type": "votes_proceedings",
            "house": "National Assembly",
        },
        {
            "name": "Parliament Bill Tracker",
            "url": "https://www.parliament.go.ke/the-national-assembly/house-business/bill-tracker",
            "selector": "a[href$='.pdf']",
            "type": "bill_tracker",
            "house": "National Assembly",
        },
        {
            "name": "Committee Reports",
            "url": "https://www.parliament.go.ke/the-national-assembly/house-business/committee-reports",
            "selector": "a[href$='.pdf']",
            "type": "committee_report",
            "house": "National Assembly",
        },
        {
            "name": "Kenya Gazette",
            "url": "http://kenyalaw.org/kenya_gazette/",
            "selector": ".view-content .views-row, .gazette-item, a[href$='.pdf']",
            "type": "gazette",
            "house": "Both",
        },
    ]

    def __init__(self):
        self.supabase = None
        if SUPABASE_OK:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self.supabase = create_client(url, key)
                logger.info("Supabase client initialized for stage detection.")

    def get_active_bills(self) -> List[Dict[str, Any]]:
        """Fetch all bills that have NOT reached Presidential Assent."""
        if not self.supabase:
            logger.error("No Supabase client — cannot fetch bills.")
            return []

        try:
            response = self.supabase.table("bills").select(
                "id, title, status, house, date, session_year"
            ).neq("status", "Assented").execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch active bills: {e}")
            return []

    def detect_stages_from_document(self, text: str, bills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Scan a document's text for stage mentions of any active bill.
        Returns list of {bill_id, bill_title, detected_stage, source_text_snippet}.
        
        TEMPORAL GUARD: Only accepts signals if the document year matches the bill's session_year.
        """
        # 1. Extract the primary date/year of this document
        detected_date = extract_date_from_order_paper(text)
        detected_year = int(detected_date.split('-')[0]) if detected_date else None
        
        results = []
        for bill in bills:
            title = bill.get("title", "")
            bill_year = bill.get("session_year")
            
            # --- AGENTIC TEMPORAL GUARD ---
            # If we know the document year and it mismatch the bill's intended session_year, 
            # we ignore this document to prevent contamination (e.g., 2024 news affecting 2026 record).
            if detected_year and bill_year and int(detected_year) != int(bill_year):
                logger.debug(f"      [Temporal Guard] Skipping '{title}' (Bill Year: {bill_year} vs Doc Year: {detected_year})")
                continue

            stage = detect_stage_from_text(text, title)
            if stage:
                # Find the matching snippet for audit
                snippet = ""
                text_lower = text.lower()
                keywords = generate_bill_keywords(title)
                for kw in keywords:
                    idx = text_lower.find(kw)
                    if idx >= 0:
                        start = max(0, idx - 100)
                        end = min(len(text), idx + len(kw) + 200)
                        snippet = text[start:end].strip()
                        break

                results.append({
                    "bill_id": bill["id"],
                    "bill_title": title,
                    "detected_stage": stage,
                    "source_snippet": snippet[:500],
                    "detected_date": detected_date
                })
        return results

    def update_bill_stage(self, bill_id: str, stage_key: str, source_name: str, source_url: str, detected_date: Optional[str] = None):
        """Update a bill's stage in Supabase if the new stage is higher than current."""
        if not self.supabase:
            logger.warning("No Supabase client — cannot update stage.")
            return False

        stage_order = {s["key"]: s["order"] for s in BILL_STAGES}
        stage_labels = {s["key"]: s["label"] for s in BILL_STAGES}
        new_order = stage_order.get(stage_key, 0)

        try:
            # Fetch current bill
            bill_resp = self.supabase.table("bills").select("id, status, stages").eq("id", bill_id).single().execute()
            bill = bill_resp.data
            if not bill:
                logger.warning(f"Bill {bill_id} not found in DB.")
                return False

            current_status = bill.get("status", "Publication")
            current_stages = bill.get("stages", {}) or {}

            # Map current status to order
            current_key = None
            for s in BILL_STAGES:
                if s["label"].lower() == current_status.lower():
                    current_key = s["key"]
                    break
            current_order = stage_order.get(current_key, 1) if current_key else 1

            if new_order <= current_order:
                logger.info(f"Bill {bill_id}: stage '{stage_key}' (order {new_order}) is not higher than current '{current_status}' (order {current_order}). Skipping.")
                return False

            # Build updated stages object
            now_iso = datetime.now(timezone.utc).isoformat()
            new_label = stage_labels.get(stage_key, stage_key)

            # Mark all stages up to new_order as completed
            for s in BILL_STAGES:
                sk = s["key"]
                if s["order"] <= new_order:
                    if sk not in current_stages or current_stages[sk].get("status") != "completed":
                        current_stages[sk] = {
                            "status": "completed",
                            "completed_at": detected_date or now_iso,
                            "source": source_name,
                            "source_url": source_url,
                        }
                else:
                    if sk not in current_stages:
                        current_stages[sk] = {"status": "pending"}

            # Update bill
            self.supabase.table("bills").update({
                "status": new_label,
                "stages": current_stages,
                "updated_at": now_iso,
            }).eq("id", bill_id).execute()

            logger.info(f"✅ Bill {bill_id} stage updated: {current_status} → {new_label}")
            return True

        except Exception as e:
            logger.error(f"Failed to update stage for bill {bill_id}: {e}")
            return False

    def run_full_detection(self, max_pages: int = 3):
        """
        Main entry point: scrape all stage sources, detect stages, update DB.
        """
        if not PLAYWRIGHT_OK:
            logger.error("Playwright not installed — cannot run stage detection.")
            return

        bills = self.get_active_bills()
        if not bills:
            logger.warning("No active bills found. Nothing to detect.")
            return

        logger.info(f"Running stage detection for {len(bills)} active bills...")

        try:
            import requests as req_lib
        except ImportError:
            req_lib = None

        try:
            import fitz
            FITZ_OK = True
        except ImportError:
            FITZ_OK = False

        updates_applied = 0

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            )
            page = ctx.new_page()

            for source in self.STAGE_SOURCES:
                logger.info(f"\n>>> Scanning: {source['name']}")
                try:
                    page.goto(source["url"], wait_until="networkidle", timeout=60000)
                    time.sleep(1)

                    # Extract PDF links from the listing page
                    pdf_links = page.evaluate("""(sel) => {
                        return Array.from(document.querySelectorAll(sel || 'a[href$=".pdf"]')).map(a => ({
                            text: a.textContent.trim(),
                            href: a.href
                        })).filter(l => l.href.toLowerCase().endsWith('.pdf'));
                    }""", source.get("selector"))

                    # Limit to recent documents
                    pdf_links = pdf_links[:max_pages * 5]

                    for link in pdf_links:
                        pdf_url = link["href"]
                        doc_title = link["text"]
                        logger.info(f"  Scanning PDF: {doc_title[:80]}...")

                        # Download PDF
                        pdf_text = ""
                        if req_lib:
                            try:
                                r = req_lib.get(pdf_url, timeout=30, allow_redirects=True)
                                if r.content[:5] == b"%PDF-":
                                    if FITZ_OK:
                                        try:
                                            doc = fitz.open(stream=r.content, filetype="pdf")
                                            pdf_text = "\n".join(pg.get_text() for pg in doc)
                                            doc.close()
                                        except Exception:
                                            pass
                            except Exception as e:
                                logger.warning(f"    PDF download failed: {e}")

                        if not pdf_text.strip():
                            continue

                        # Detect stages for each active bill
                        detections = self.detect_stages_from_document(pdf_text, bills)
                        detected_date = extract_date_from_order_paper(pdf_text)

                        for det in detections:
                            logger.info(f"    🎯 Detected: '{det['bill_title'][:50]}...' at stage '{det['detected_stage']}' in '{doc_title[:50]}...'")
                            updated = self.update_bill_stage(
                                bill_id=det["bill_id"],
                                stage_key=det["detected_stage"],
                                source_name=source["name"],
                                source_url=pdf_url,
                                detected_date=detected_date,
                            )
                            if updated:
                                updates_applied += 1

                        time.sleep(0.5)

                except Exception as e:
                    logger.error(f"  Source '{source['name']}' failed: {e}")

            browser.close()

        logger.info(f"\n=== Stage Detection Complete: {updates_applied} updates applied ===")


if __name__ == "__main__":
    detector = StageDetector()
    detector.run_full_detection(max_pages=3)
