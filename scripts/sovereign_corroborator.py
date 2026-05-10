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

    def _active_search_waterfall(self, title: str) -> List[Dict]:
        """Nasaka-Style Waterfall Search for Bill Status."""
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key: 
            logger.warning("SERPAPI_API_KEY missing - active search aborted.")
            return []

        search_variations = [
            f'"{title}" Kenya Bill official status',
            f'"{title}" Kenya Parliament "withdrawn" OR "rejected" OR "lapsed"',
            f'"{title}" presidential assent Kenya Gazette 202'
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
            active_hits = self._active_web_search(bill.get("title", ""))
            
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
            
            # Check for high-confidence termination events in web hits
            for hit in context.get("active_web_hits", []):
                snippet = hit["snippet"].lower()
                headline = hit["headline"].lower()
                # If similarity is high (>0.85) AND snippet mentions withdrawal/rejection
                if hit["similarity_score"] > 0.85 or context["title"].lower() in headline:
                    if any(w in (headline + " " + snippet) for w in ['withdrawn', 'rejected', 'negatived', 'lapsed', 'nullified']):
                        sovereign_status = "DISCARDED"
                        status_reasons.append(f"Confirmed {hit['source']} via {hit['headline']}")
                    elif 'assent' in (headline + " " + snippet) or 'signed into law' in snippet:
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

    def run_all_pending(self, limit: int = 10):
        """Process bills that need analysis."""
        if not self.db: return

        try:
            pending = self.db.select("bills", "id", limit=limit, eq="analysis_status", eq_val="pending")
            if not pending:
                logger.info("No bills pending analysis.")
                return

            logger.info(f"🚀 Found {len(pending)} bills for corroboration.")
            for item in pending:
                self.process_bill(item["id"])
                time.sleep(2)
        except Exception as e:
            logger.error(f"Batch corroboration failed: {e}")

if __name__ == "__main__":
    corroborator = SovereignCorroborator()
    corroborator.run_all_pending()
