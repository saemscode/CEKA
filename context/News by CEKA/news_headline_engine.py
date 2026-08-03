"""
news_headline_engine.py - CEKA News Intelligence Engine: Stage 6
=====================================================================
Generates canonical_headline, summary_short, summary_medium for NIOs
that have earned it (state 'verified' with no summary yet, or state
'developing' since those are actively changing and get refreshed
every run).

The LLM proposes candidates. This file picks the winner
deterministically - headline selection is not left to the model's
own preference, for the same reason confidence scoring is not.

pip install supabase python-dotenv
"""

import os
import sys
import re
import json
import time
import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [HEADLINE] - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("news_headline_engine.log", encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from multi_llm_orchestrator import MultiLLMOrchestrator  # your existing module

HEADLINE_MAX_NIOS_PER_RUN = int(os.getenv("HEADLINE_MAX_NIOS_PER_RUN", "60"))

CLICKBAIT_TERMS = (
    "shocking", "you won't believe", "this is why", "here's why", "gone wrong",
    "breaking:", "must see", "goes viral", "netizens react",
)

HEADLINE_SYSTEM_PROMPT = """You are a headline editor for CEKA (Civic Education Kenya), a civic news feed for
ordinary Kenyan citizens. You will be given the structured facts of one news event: its story DNA,
its evidence (which outlets reported it), and its timeline.

Return EXACTLY a raw JSON object. No markdown. No preamble. Start with { end with }.
{
  "headline_candidates": ["candidate 1", "candidate 2", "candidate 3", "candidate 4", "candidate 5"],
  "summary_short": "one sentence, under 140 characters, plain English, no jargon",
  "summary_medium": "2 to 3 sentences: what happened, then why it matters to an ordinary Kenyan citizen"
}

Headline rules: plain English, 6 to 12 words, no clickbait phrasing, no ALL CAPS, states what
happened not how the writer feels about it. Do not editorialize. Do not speculate beyond the
evidence given."""


def _score_headline(headline: str, story_dna: Dict[str, Any]) -> float:
    if not headline or not headline.strip():
        return -1.0
    h = headline.strip()
    length = len(h)
    score = 0.0

    # Brevity: reward the 40-80 character sweet spot, penalise outside it.
    if 40 <= length <= 80:
        score += 30
    elif length < 40:
        score += 15
    else:
        score += max(0, 30 - (length - 80) * 0.5)

    # Clickbait penalty
    lower = h.lower()
    if any(term in lower for term in CLICKBAIT_TERMS):
        score -= 25

    # ALL CAPS penalty (excluding short acronyms embedded in the text)
    letters = [c for c in h if c.isalpha()]
    if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.6:
        score -= 20

    # Specificity: reward presence of story_dna entities in the headline
    for key in ("who", "what", "where"):
        val = str(story_dna.get(key) or "")
        if val and val.lower() in lower:
            score += 10

    # Reward at least one digit (dates, amounts, counts tend to be specific)
    if re.search(r"\d", h):
        score += 5

    return score


def _pick_best_headline(candidates: List[str], story_dna: Dict[str, Any]) -> Optional[str]:
    if not candidates:
        return None
    scored = [(c, _score_headline(c, story_dna)) for c in candidates if c and c.strip()]
    if not scored:
        return None
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]


class SupabaseStore:
    def __init__(self):
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. real data unavailable.")
        self.client = create_client(url, key)

    def fetch_targets(self, limit: int) -> List[Dict[str, Any]]:
        developing = (
            self.client.table("nios")
            .select("id, story_dna, evidence, timeline, state")
            .eq("state", "developing")
            .limit(limit)
            .execute()
        ).data or []
        verified_unsummarized = (
            self.client.table("nios")
            .select("id, story_dna, evidence, timeline, state")
            .eq("state", "verified")
            .is_("summary_short", "null")
            .limit(limit)
            .execute()
        ).data or []
        seen_ids = set()
        merged = []
        for row in developing + verified_unsummarized:
            if row["id"] not in seen_ids:
                seen_ids.add(row["id"])
                merged.append(row)
        return merged[:limit]

    def update_nio(self, nio_id: str, update: Dict[str, Any]) -> None:
        self.client.table("nios").update(update).eq("id", nio_id).execute()


def run() -> None:
    store = SupabaseStore()
    orchestrator = MultiLLMOrchestrator()

    targets = store.fetch_targets(HEADLINE_MAX_NIOS_PER_RUN)
    if not targets:
        logger.info("No NIOs need headline/summary generation this run.")
        return

    logger.info(f"Generating headlines/summaries for {len(targets)} NIO(s).")
    ok, failed = 0, 0

    for nio in targets:
        story_dna = nio.get("story_dna") or {}
        evidence = nio.get("evidence") or []
        timeline = nio.get("timeline") or []

        evidence_summary = "\n".join(
            f"- {e.get('source_name')} (tier {e.get('source_tier')}): {e.get('title')}" for e in evidence[:15]
        )
        timeline_summary = "\n".join(f"- {t.get('time')}: {t.get('event')}" for t in timeline[:15])

        prompt = (
            f"Story DNA:\n{json.dumps(story_dna, ensure_ascii=False)}\n\n"
            f"Evidence ({len(evidence)} source(s)):\n{evidence_summary}\n\n"
            f"Timeline:\n{timeline_summary}\n\n"
            "Return ONLY the JSON object."
        )

        try:
            parsed = orchestrator.get_structured_intelligence(prompt, HEADLINE_SYSTEM_PROMPT)
            candidates = parsed.get("headline_candidates", []) if parsed else []
            best = _pick_best_headline(candidates, story_dna)

            if not best:
                logger.warning(f"  [FAIL] No usable headline for NIO {nio['id']}")
                failed += 1
                continue

            store.update_nio(nio["id"], {
                "canonical_headline": best,
                "headline_candidates": candidates,
                "summary_short": parsed.get("summary_short"),
                "summary_medium": parsed.get("summary_medium"),
            })
            ok += 1
            logger.info(f"  [OK] {nio['id']}: {best}")
        except Exception as e:
            logger.error(f"Headline generation failed for NIO {nio['id']}: {e}")
            failed += 1
        time.sleep(1.0)

    logger.info(f"Headline run complete. OK={ok} Failed={failed}")


if __name__ == "__main__":
    run()
