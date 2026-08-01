import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
import requests # Added for SerpAPI

# ---------------------------------------------------------------------------
# Load environment variables from .env if python-dotenv is available
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

try:
    from supabase import create_client, Client
    SUPABASE_OK = True
except ImportError:
    SUPABASE_OK = False
    logging.warning("supabase-py not installed – fallback to direct REST.")

try:
    from supabase_direct import SupabaseDirect
    DIRECT_OK = True
except ImportError:
    DIRECT_OK = False

try:
    from stage_detector import normalize_stage_label
    STAGES_OK = True
except ImportError:
    STAGES_OK = False

try:
    from multi_llm_orchestrator import MultiLLMOrchestrator
    ORCHESTRATOR_OK = True
except ImportError:
    ORCHESTRATOR_OK = False
    logging.getLogger(__name__).warning("multi_llm_orchestrator not found – High Fidelity AI synthesis disabled.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [CORROBORATOR] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("corroborator.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ===================================================================
#  CORROBORATION PROMPT (The CEKA Intelligence Standard)
# ===================================================================
CORROBORATOR_SYSTEM_PROMPT = """You are CEKA's Legislative Intelligence Engine. 
Your mission is to transform raw, multi-source legislative data into a high-fidelity, plain-English intelligence report for Kenyan citizens.

You will be provided with a 'Rich Context Object' containing:
1. Official Bill Text (extracted via OCR/PDF).
2. News Mentions (Tiered sources from Tier 1 to 5).
3. Current Legislative Stage.
4. Metadata (Sponsor, Date, House).

TASK:
1. PRODUCE A PLAIN-ENGLISH SUMMARY: Explain exactly what this bill changes in 3-4 sentences.
2. POLICY IMPLICATIONS: List the top 3 ways this affects a normal citizen (e.g. taxes, health, security).
3. CONSTITUTIONAL ANCHORS: Identify which Articles of the Constitution of Kenya are triggered or potentially violated.
4. PUBLIC SENTIMENT & CONTEXT: Summarize what media and stakeholders are saying (Source Tiers 2-5).
5. CORROBORATION SCORE (0-100): Calculate how verified this data is. 
   - 100: Confirmed by official docs + mainstream news + gazette.
   - 50: Official doc exists but news/gazette context is missing.
   - 20: Missing official text, based only on news reports.

OUTPUT FORMAT: Strict JSON only."""

class SovereignCorroborator:
    """
    Assembles the Rich Context Object for a bill and uses the Sovereign AI Router
    to generate a corroborated intelligence report.
    """

    def __init__(self):
        self.db = None
        try:
            self.db = SupabaseDirect()
            logger.info("SupabaseDirect client initialized for corroboration.")
        except Exception as e:
            logger.warning(f"Could not initialize SupabaseDirect: {e}")
        
        self.orchestrator = MultiLLMOrchestrator() if ORCHESTRATOR_OK else None

    def _dice_similarity(self, s1: str, s2: str) -> float:
        """Calculate Dice coefficient for string similarity gate (0.0 to 1.0)."""
        s1, s2 = s1.lower(), s2.lower()
        if s1 == s2: return 1.0
        if len(s1) < 2 or len(s2) < 2: return 0.0
        
        bigrams1 = set([s1[i:i+2] for i in range(len(s1)-1)])
        bigrams2 = set([s2[i:i+2] for i in range(len(s2)-1)])
        
        overlap = len(bigrams1 & bigrams2)
        return (2.0 * overlap) / (len(bigrams1) + len(bigrams2))

    def _active_web_search(self, title: str, year: Optional[str] = None) -> List[Dict]:
        """Nasaka-Style Waterfall Search for Bill Status (Year-Strict)."""
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key: 
            logger.warning("SERPAPI_API_KEY missing - active search aborted.")
            return []

        year_suffix = f" {year}" if year else ""
        search_variations = [
            f'"{title}"{year_suffix} Kenya Bill official status',
            f'"{title}"{year_suffix} Kenya Parliament "withdrawn" OR "rejected" OR "lapsed"',
            f'"{title}"{year_suffix} presidential assent Kenya Gazette'
        ]
        
        all_results = []
        for query in search_variations:
            try:
                params = {
                    "q": query,
                    "location": "Kenya",
                    "hl": "en",
                    "gl": "ke",
                    "google_domain": "google.co.ke",
                    "api_key": api_key,
                    "num": 5
                }
                logger.info(f"    [SEARCH] Query: {query}")
                resp = requests.get("https://serpapi.com/search", params=params, timeout=15)
                data = resp.json()
                
                results = data.get("organic_results", [])
                for r in results:
                    snippet = r.get("snippet", "")
                    headline = r.get("title", "")
                    
                    # Proofing Gate: Only keep if headline is meaningfully similar to bill title
                    similarity = self._dice_similarity(title, headline)
                    if similarity > 0.40 or title.lower() in snippet.lower():
                        all_results.append({
                            "source": r.get("source", "Google Search"),
                            "headline": headline,
                            "snippet": snippet,
                            "link": r.get("link"),
                            "similarity_score": similarity
                        })
                time.sleep(1) # Rate limit
                if all_results: break # Stop waterfall if first variation yields hits
            except Exception as e:
                logger.error(f"      [SEARCH-ERR] {e}")
        
        return all_results

    def get_rich_context(self, bill_id: str) -> Optional[Dict[str, Any]]:
        """Fetch all data points for a bill, including active web search results."""
        if not self.db:
            return None

        try:
            # 1. Fetch Bill
            bills = self.db.select("bills", "*", eq="id", eq_val=bill_id)
            if not bills or not isinstance(bills, list) or len(bills) == 0:
                logger.warning(f"No bill found for id {bill_id}")
                return None
            bill = bills[0]
            if not bill or not isinstance(bill, dict) or not bill.get("id"):
                logger.warning(f"Malformed bill record for {bill_id}: {bill}")
                return None

            # 2. News Mentions (DB)
            try:
                news = self.db.select("bill_news_mentions", "*", eq="bill_id", eq_val=bill_id) or []
            except Exception:
                news = []

            # 3. Active Search Layer (Nasaka-Style)
            year_str = str(bill.get("session_year", ""))
            active_hits = self._active_web_search(bill.get("title", ""), year=year_str)
            
            # 4. Assemble Context Object
            context = {
                "bill_id": bill["id"],
                "title": bill.get("title", "Unknown"),
                "house": bill.get("house", ""),
                "status": bill.get("status", ""),
                "sponsor": bill.get("sponsor", ""),
                "date_introduced": bill.get("date", ""),
                "official_text": (bill.get("text_content") or "")[:10000],
                "tabloid_summary": bill.get("tabloid_summary") or "",
                "ai_concerns": bill.get("ai_concerns") or [],
                "news_mentions": [
                    {
                        "source": m.get("source_name", "Unknown"),
                        "headline": m.get("headline", ""),
                        "snippet": (m.get("snippet") or "")[:500]
                    } for m in news if isinstance(m, dict)
                ],
                "active_web_hits": active_hits,
                "stages_json": bill.get("stages", {})
            }
            return context
        except Exception as e:
            logger.error(f"Failed to fetch rich context for {bill_id}: {e}")
            return None

    def calculate_raw_corroboration_score(self, context: Dict[str, Any]) -> int:
        """Heuristic-based score before LLM refinement."""
        score = 0
        if context.get("official_text") and len(context["official_text"]) > 100:
            score += 50
        if context.get("news_mentions"):
            score += min(30, len(context["news_mentions"]) * 10)
        if context.get("date_introduced"):
            score += 10
        if context.get("sponsor") != "Government": # Individual sponsors often harder to verify
            score += 10
        return min(100, score)

    def process_bill(self, bill_id: str) -> bool:
        """Generate analysis and update DB."""
        if not self.orchestrator:
            logger.error("AI Orchestrator not available.")
            return False
        if not self.db:
            logger.error("DB client not available.")
            return False

        context = self.get_rich_context(bill_id)
        if not context: return False

        # ── Status Lock Guard: Skip processing if bill is locked ──
        # Fetch fresh record to check lock
        bill_record = (self.db.select("bills", "status_lock", eq="id", eq_val=bill_id) or [None])[0]
        if bill_record and bill_record.get("status_lock"):
            logger.info(f"🔒 LOCKED: Skipping corroboration for '{context['title']}' ({bill_id})")
            return True # Success in the sense that we handled it by skipping

        logger.info(f"🧠 Corroborating: {context['title']}...")

        prompt = f"Analyze the following Rich Context Object and produce the CEKA Intelligence Report:\n\n{json.dumps(context, indent=2)}"
        
        try:
            # High-fidelity synthesis — use full 10-provider chain (fastest/cheapest first)
            response_raw = self.orchestrator.synthesize(
                prompt,
                system_prompt=CORROBORATOR_SYSTEM_PROMPT,
                # No provider_chain override — use orchestrator default:
                # cerebras → groq → deepseek → nvidia → openrouter → cohere → huggingface → gemini → anthropic → openai
            )
            
            if not response_raw:
                 raise Exception("All LLM providers failed for corroboration.")

            analysis = self.orchestrator.extract_json(response_raw)
            if not analysis:
                 raise Exception("Failed to extract valid JSON from LLM response.")

            # Update Supabase
            update_data = {
                "neural_summary": analysis.get("summary"),
                "corroboration_score": analysis.get("corroboration_score", self.calculate_raw_corroboration_score(context)),
                "analysis_status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            # Build the full enriched narrative
            full_narrative = f"{analysis.get('summary', '')}\n\n**Policy Implications:**\n"
            for imp in analysis.get('policy_implications', []):
                full_narrative += f"- {imp}\n"

            full_narrative += "\n**Constitutional Anchors:**\n"
            for anchor in analysis.get('constitutional_anchors', []):
                full_narrative += f"- {anchor}\n"

            # Stitch in tabloid data from news_intelligence pipeline
            tabloid = context.get("tabloid_summary", "")
            if tabloid and tabloid.strip():
                full_narrative += f"\n\n**Media Context:**\n{tabloid.strip()}"

            # Stitch in AI-identified citizen concerns
            concerns_raw = context.get("ai_concerns", [])
            concerns: List[Any] = []
            if isinstance(concerns_raw, list):
                concerns = concerns_raw
            elif isinstance(concerns_raw, str):
                try:
                    parsed_concerns = json.loads(concerns_raw)
                    if isinstance(parsed_concerns, list):
                        concerns = parsed_concerns
                except Exception:
                    pass

            if concerns:
                full_narrative += "\n\n**Citizen Concerns (AI-identified):**\n"
                for c in concerns:
                    full_narrative += f"- {c}\n"

            update_data["summary"] = full_narrative[:3000]

            # 4. Status Decision Engine (Active Propagation)
            sovereign_status = context.get("status")
            status_reasons = []

            # ── Status Lock: If the bill has a manual status_lock, skip all automated status changes ──
            bill_record = (self.db.select("bills", "status_lock,stages,session_year", eq="id", eq_val=bill_id) or [None])[0]
            if bill_record and bill_record.get("status_lock"):
                logger.info(f"    🔒 Status locked for '{context['title']}' — skipping automated status propagation.")
            else:
                # ── Stage Regression Guard: Determine the highest confirmed non-discarded stage ──
                stages_json = context.get("stages_json") or (bill_record or {}).get("stages") or {}
                if isinstance(stages_json, str):
                    try:
                        stages_json = json.loads(stages_json)
                    except Exception:
                        stages_json = {}

                # Map stage keys to order for regression check
                _STAGE_ORDER = {
                    "pre_publication": 0, "publication": 1, "first_reading": 2,
                    "second_reading": 3, "committee": 4, "report": 5,
                    "third_reading": 6, "mediation": 7, "assent": 8, "discarded": 99
                }
                highest_confirmed_order = -1
                for sk, sv in stages_json.items():
                    if isinstance(sv, dict) and sv.get("status") == "completed" and sk != "discarded":
                        highest_confirmed_order = max(highest_confirmed_order, _STAGE_ORDER.get(sk, -1))

                # ── Year Resolution: bill's actual session_year, no hardcoded fallback ──
                bill_year_raw = (bill_record or {}).get("session_year") or context.get("date_introduced", "")[:4]
                bill_year = str(bill_year_raw) if bill_year_raw else None

                # Year inference tokens for when year isn't explicitly mentioned
                _CURRENT_YEAR_TOKENS = ["2026", "2026/27", "fy 2026", "latest", "current", "ongoing"]
                _OLD_YEAR_TOKENS = ["2023", "2024", "2025", "2022", "2021"]

                # Check for high-confidence termination or assent events in web hits
                for hit in context.get("active_web_hits", []):
                    snippet = hit["snippet"].lower()
                    headline = hit["headline"].lower()
                    combined = headline + " " + snippet

                    # ── YEAR PROXIMITY GUARD ──
                    # Step 1: If combined text mentions a DIFFERENT year explicitly, skip
                    mentions_old_year = any(y in combined for y in _OLD_YEAR_TOKENS)
                    mentions_bill_year = bill_year and bill_year in combined
                    mentions_current_tokens = any(t in combined for t in _CURRENT_YEAR_TOKENS if t != bill_year)

                    if mentions_old_year and not mentions_bill_year:
                        # Old year present, bill year absent → almost certainly about a different bill
                        logger.debug(f"      [Year Guard] Skipping hit: old year detected, bill year absent — {headline[:60]}")
                        continue

                    if not mentions_bill_year and not mentions_current_tokens:
                        # Neither bill year nor current-year inference tokens → ambiguous, skip for safety
                        logger.debug(f"      [Year Guard] Skipping hit: no year signal — {headline[:60]}")
                        continue

                    # Step 2: For terminal keywords, require year proximity (within ~80 chars)
                    TERMINATION_WORDS = ['withdrawn', 'rejected', 'negatived', 'lapsed', 'nullified', 'not passed']

                    if hit["similarity_score"] > 0.85 or context["title"].lower() in headline:
                        # ── Check for DISCARDED signals with year-proximity enforcement ──
                        found_termination = False
                        for tw in TERMINATION_WORDS:
                            tw_idx = combined.find(tw)
                            if tw_idx == -1:
                                continue
                            # Year proximity: bill_year must appear within 80 chars of the termination word
                            if bill_year:
                                year_idx = combined.find(bill_year)
                                if year_idx != -1 and abs(year_idx - tw_idx) <= 80:
                                    found_termination = True
                                    break
                                # Also check current-year inference tokens near the termination word
                                for token in _CURRENT_YEAR_TOKENS:
                                    tok_idx = combined.find(token)
                                    if tok_idx != -1 and abs(tok_idx - tw_idx) <= 80:
                                        found_termination = True
                                        break
                                if found_termination:
                                    break
                            else:
                                # No bill year known — only accept if no old year is mentioned at all
                                if not mentions_old_year:
                                    found_termination = True
                                    break

                        if found_termination:
                            # ── Stage Regression Guard: Don't regress if a later stage is confirmed ──
                            if highest_confirmed_order >= _STAGE_ORDER.get("second_reading", 3):
                                logger.info(f"      [Regression Guard] Blocking DISCARDED — bill has confirmed stages up to order {highest_confirmed_order}")
                            else:
                                sovereign_status = "DISCARDED"
                                status_reasons.append(f"Confirmed {hit['source']} via {hit['headline']}")

                        # ── Check for ASSENT signals ──
                        # GUARD: bare 'assent' matches speculative news ('will the president assent?')
                        # Require 'presidential assent' or 'signed into law' as confirmation phrases
                        elif 'presidential assent' in combined or 'signed into law' in snippet:
                            sovereign_status = "ASSENT"
                            status_reasons.append(f"Confirmed Assent via {hit['source']}")

                # Normalize and Apply
                if STAGES_OK:
                    sovereign_status = normalize_stage_label(sovereign_status)

                if sovereign_status != context.get("status"):
                    logger.info(f"    📢 PROPAGating Status change: {context['status']} -> {sovereign_status} ({', '.join(status_reasons)})")
                    update_data["status"] = sovereign_status

            self.db.update("bills", update_data, eq="id", eq_val=bill_id)
            logger.info(f"✅ Analysis & Status Propagation complete for: {context['title']}")
            return True

        except Exception as e:
            logger.error(f"Failed to process bill {bill_id}: {e}")
            try:
                self.db.update("bills", {"analysis_status": "failed"}, eq="id", eq_val=bill_id)
            except Exception:
                pass
            return False

    def _reset_stale_failed_bills(self, stale_hours: int = 6) -> int:
        """
        Task 4: Un-stick permanently failed bills.
        Resets bills with analysis_status='failed' that have not been updated
        in more than `stale_hours` hours back to 'pending' so they re-enter
        the corroboration queue on the next run.
        Returns the number of bills reset.
        """
        if not self.db:
            return 0
        try:
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=stale_hours)).isoformat()
            # Fetch failed bills — SupabaseDirect select supports one eq filter.
            # We fetch by status=failed and filter by updated_at client-side.
            failed_bills = self.db.select(
                "bills",
                "id,title,updated_at",
                eq="analysis_status",
                eq_val="failed",
            ) or []

            reset_count = 0
            for bill in failed_bills:
                updated_at = bill.get("updated_at") or ""
                # Reset if updated_at is absent OR older than the cutoff
                if not updated_at or updated_at < cutoff:
                    try:
                        self.db.update(
                            "bills",
                            {
                                "analysis_status": "pending",
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            },
                            eq="id",
                            eq_val=bill["id"],
                        )
                        reset_count += 1
                        logger.info(
                            f"  [Reset] Bill '{bill.get('title', bill['id'][:8])}' "
                            f"(failed >{stale_hours}h ago) -> pending"
                        )
                    except Exception as e:
                        logger.warning(f"  [Reset] Could not reset bill {bill['id'][:8]}: {e}")

            if reset_count:
                logger.info(f"[Reset] {reset_count} stale-failed bill(s) reset to 'pending'.")
            else:
                logger.info("[Reset] No stale-failed bills found.")
            return reset_count
        except Exception as e:
            logger.error(f"[Reset] _reset_stale_failed_bills failed: {e}")
            return 0

    def run_all_pending(self, limit: int = 10):
        """Process bills that need analysis."""
        if not self.db: return

        # Task 4: Un-stick any bills stuck in 'failed' for >6 hours before polling pending
        self._reset_stale_failed_bills(stale_hours=6)

        try:
            pending = self.db.select("bills", "id", limit=limit, eq="analysis_status", eq_val="pending")
            if not pending:
                logger.info("No bills pending analysis.")
                return

            logger.info(f"[CORROBORATOR] Found {len(pending)} bills for corroboration.")
            for item in pending:
                self.process_bill(item["id"])
                time.sleep(2)
        except Exception as e:
            logger.error(f"Batch corroboration failed: {e}")

if __name__ == "__main__":
    corroborator = SovereignCorroborator()
    corroborator.run_all_pending()
