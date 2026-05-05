import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
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
    from sovereign_ai_router import get_router
    AI_ROUTER_OK = True
except ImportError:
    AI_ROUTER_OK = False
    logging.warning("sovereign_ai_router not importable – AI synthesis disabled.")

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
        self.supabase = None
        if SUPABASE_OK:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self.supabase = create_client(url, key)
                logger.info("Supabase client initialized for corroboration.")
        
        self.router = None
        if AI_ROUTER_OK:
            self.router = get_router()

    def get_rich_context(self, bill_id: str) -> Optional[Dict[str, Any]]:
        """Fetch all data points for a bill to build the context object."""
        if not self.supabase:
            return None

        try:
            # 1. Fetch Bill
            bill_resp = self.supabase.table("bills").select("*").eq("id", bill_id).single().execute()
            bill = bill_resp.data
            if not bill: return None

            # 2. Fetch News Mentions
            news_resp = self.supabase.table("bill_news_mentions").select("*").eq("bill_id", bill_id).execute()
            news = news_resp.data or []

            # 3. Assemble Context Object
            context = {
                "bill_id": bill["id"],
                "title": bill.get("title"),
                "house": bill.get("house"),
                "status": bill.get("status"),
                "sponsor": bill.get("sponsor"),
                "date_introduced": bill.get("date"),
                "official_text": bill.get("text_content", "")[:10000],  # Limit for LLM context
                "tabloid_summary": bill.get("tabloid_summary") or "",
                "ai_concerns": bill.get("ai_concerns") or [],
                "news_mentions": [
                    {
                        "source": m["source_name"],
                        "headline": m["headline"],
                        "snippet": m["snippet"][:500] if m.get("snippet") else ""
                    } for m in news
                ],
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
        """Generate analysis and update Supabase."""
        if not self.router:
            logger.error("AI Router not available.")
            return False

        context = self.get_rich_context(bill_id)
        if not context: return False

        logger.info(f"🧠 Corroborating: {context['title']}...")

        prompt = f"Analyze the following Rich Context Object and produce the CEKA Intelligence Report:\n\n{json.dumps(context, indent=2)}"
        
        try:
            response_raw = self.router.generate(prompt, system_instruction=CORROBORATOR_SYSTEM_PROMPT)
            
            # Clean JSON from response (remove markdown wrappers)
            clean_json = response_raw.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:-3].strip()
            elif clean_json.startswith("```"):
                clean_json = clean_json[3:-3].strip()

            analysis = json.loads(clean_json)

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

            self.supabase.table("bills").update(update_data).eq("id", bill_id).execute()
            logger.info(f"✅ Analysis complete for: {context['title']}")
            return True

        except Exception as e:
            logger.error(f"Failed to process bill {bill_id}: {e}")
            # Mark as failed in DB
            self.supabase.table("bills").update({"analysis_status": "failed"}).eq("id", bill_id).execute()
            return False

    def run_all_pending(self, limit: int = 10):
        """Process bills that need analysis."""
        if not self.supabase: return

        try:
            # Fetch bills pending analysis or with high priority
            response = self.supabase.table("bills").select("id").eq("analysis_status", "pending").limit(limit).execute()
            pending = response.data or []
            
            if not pending:
                logger.info("No bills pending analysis.")
                return

            logger.info(f"🚀 Found {len(pending)} bills for corroboration.")
            for item in pending:
                self.process_bill(item["id"])
                time.sleep(2) # Avoid rate limits
        except Exception as e:
            logger.error(f"Batch corroboration failed: {e}")

if __name__ == "__main__":
    corroborator = SovereignCorroborator()
    corroborator.run_all_pending()
