"""
news_enrichment.py - CEKA News Intelligence Engine: Stage 2 Enrichment
==========================================================================
Reads rows in `bill_news_mentions` where enrichment_status = 'pending',
extracts structured
Story DNA / entities / claims via your existing MultiLLMOrchestrator
(imported directly - same provider cascade, same cost profile you
already run for bill analysis), generates a 768-dim embedding via
embedding_engine.EmbeddingEngine, and writes both back onto the row.

Requires multi_llm_orchestrator.py and embedding_engine.py to be
importable from the same working directory (or on PYTHONPATH).

pip install supabase python-dotenv
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [ENRICH] - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("news_enrichment.log", encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from multi_llm_orchestrator import MultiLLMOrchestrator  # your existing module
from embedding_engine import EmbeddingEngine

ENRICHMENT_MAX_SIGNALS_PER_RUN = int(os.getenv("ENRICHMENT_MAX_SIGNALS_PER_RUN", "100"))
ENRICHMENT_BUDGET_SECONDS = int(os.getenv("ENRICHMENT_BUDGET_SECONDS", "3600"))

ENRICHMENT_SYSTEM_PROMPT = """You are a signal-intelligence extraction engine for CEKA (Civic Education Kenya).
You read one news item at a time and extract structured, deterministic-friendly intelligence.
Do not speculate beyond the text provided. Do not editorialize.

Return EXACTLY a raw JSON object with this shape. No markdown. No preamble. Start with { end with }.
{
  "story_dna": {
    "who": "the primary actor (person, institution, or organisation)",
    "action": "the verb/action taking place, in one or two words",
    "what": "the object of the action",
    "where": "location, or 'Kenya' if national-scope and unspecified",
    "when": "a date or relative time reference found in the text, or null"
  },
  "entities": {
    "people": ["named individuals mentioned"],
    "organizations": ["named institutions, companies, or bodies mentioned"],
    "locations": ["named places mentioned"]
  },
  "claims": [
    {"actor": "who is making or is the subject of this claim", "text": "the specific factual claim, one sentence"}
  ],
  "topics": ["1 to 4 topic tags from: Politics, Finance, Health, Education, Security, Land, Elections, Judiciary, Devolution, Economy, Technology, Environment, Social Welfare"],
  "citizen_impact_score": 0
}

citizen_impact_score is 0-100: how directly this affects an ordinary Kenyan's taxes, health, land,
school fees, elections, safety, or basic rights. Pure celebrity or party-politics-only content scores under 20."""


class SupabaseStore:
    def __init__(self):
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. real data unavailable.")
        self.client = create_client(url, key)

    def fetch_pending(self, limit: int) -> List[Dict[str, Any]]:
        res = (
            self.client.table("bill_news_mentions")
            .select("id, headline, clean_content, article_url")
            .eq("enrichment_status", "pending")
            .order("scraped_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []

    def update_signal(self, signal_id: str, payload: Dict[str, Any]) -> None:
        try:
            self.client.table("bill_news_mentions").update(payload).eq("id", signal_id).execute()
        except Exception as e:
            logger.error(f"Update failed for signal {signal_id}: {e}")


def _extract_json_safe(orchestrator: MultiLLMOrchestrator, raw_prompt: str) -> Dict[str, Any]:
    return orchestrator.get_structured_intelligence(raw_prompt, ENRICHMENT_SYSTEM_PROMPT)


def enrich_signal(orchestrator: MultiLLMOrchestrator, embedder: EmbeddingEngine, signal: Dict[str, Any]) -> Dict[str, Any]:
    title = signal.get("headline") or ""
    body = signal.get("clean_content") or ""

    prompt = f"Headline: {title}\n\nArticle text:\n{body[:8000]}\n\nReturn ONLY the JSON object."
    parsed = _extract_json_safe(orchestrator, prompt)

    if not parsed or "story_dna" not in parsed:
        return {"enrichment_status": "failed"}

    embed_text = f"{title}\n{parsed.get('story_dna', {})}\n{body[:2000]}"
    embedding = embedder.embed(embed_text, task_type="RETRIEVAL_DOCUMENT")

    # topics and citizen_impact_score are top-level keys in the LLM's
    # response but bill_news_mentions has no dedicated columns for
    # them - nest both into story_dna so news_fusion_relay.py's single
    # `signal["story_dna"]` read picks them up without a schema change.
    story_dna = dict(parsed.get("story_dna") or {})
    story_dna["topics"] = parsed.get("topics", [])
    story_dna["citizen_impact_score"] = parsed.get("citizen_impact_score", 0)

    update: Dict[str, Any] = {
        "story_dna": story_dna,
        "entities": parsed.get("entities", {}),
        "claims": parsed.get("claims", []),
        "enrichment_status": "enriched",
    }
    if embedding is not None:
        update["embedding"] = embedding
    return update


def run() -> None:
    store = SupabaseStore()
    orchestrator = MultiLLMOrchestrator()
    embedder = EmbeddingEngine()

    pending = store.fetch_pending(ENRICHMENT_MAX_SIGNALS_PER_RUN)
    if not pending:
        logger.info("No pending signals to enrich.")
        return

    logger.info(f"Enriching {len(pending)} signal(s). Budget: {ENRICHMENT_BUDGET_SECONDS}s")
    start = time.time()
    ok, failed = 0, 0

    for i, signal in enumerate(pending):
        if time.time() - start >= ENRICHMENT_BUDGET_SECONDS:
            logger.info(f"Budget reached. Processed {i}/{len(pending)}. Remaining stay pending.")
            break
        try:
            update = enrich_signal(orchestrator, embedder, signal)
            store.update_signal(signal["id"], update)
            if update.get("enrichment_status") == "enriched":
                ok += 1
                logger.info(f"  [OK] {signal.get('headline', '')[:70]}")
            else:
                failed += 1
                logger.warning(f"  [FAIL] {signal.get('headline', '')[:70]}")
        except Exception as e:
            logger.error(f"Enrichment error on signal {signal.get('id')}: {e}")
            store.update_signal(signal["id"], {"enrichment_status": "failed"})
            failed += 1
        time.sleep(1.0)

    logger.info(f"Enrichment run complete. OK={ok} Failed={failed}")


if __name__ == "__main__":
    run()
