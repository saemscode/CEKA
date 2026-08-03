"""
news_feed_synthesis.py - CEKA News Intelligence Engine: Stage 7
=====================================================================
Reads VERIFIED+ NIOs, ranks by importance, caps redundancy per topic,
writes an ordered `feed_snapshot` row. The frontend reads only
`feed_snapshot` (see news_feed_api.py) - it never queries `nios` or
`signals` directly, which is what keeps the interface simple while
everything above this file stays as complex as it needs to be.

Run this on a short cron interval (every 2-5 minutes is reasonable
given FEED_REFRESH_MINUTES below).

pip install supabase python-dotenv
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [FEED-SYNTH] - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("news_feed_synthesis.log", encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

FEED_SIZE = int(os.getenv("FEED_SIZE", "8"))
MAX_PER_TOPIC = int(os.getenv("FEED_MAX_PER_TOPIC", "2"))
FEED_REFRESH_MINUTES = int(os.getenv("FEED_REFRESH_MINUTES", "10"))
CANDIDATE_POOL_SIZE = int(os.getenv("FEED_CANDIDATE_POOL_SIZE", "100"))


class SupabaseStore:
    def __init__(self):
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. real data unavailable.")
        self.client = create_client(url, key)

    def fetch_candidates(self) -> List[Dict[str, Any]]:
        res = (
            self.client.table("nios")
            .select("id, canonical_headline, importance, velocity, state, topics, updated_at")
            .in_("state", ["verified", "developing", "stable"])
            .not_.is_("canonical_headline", "null")
            .order("importance", desc=True)
            .limit(CANDIDATE_POOL_SIZE)
            .execute()
        )
        return res.data or []

    def insert_snapshot(self, nio_ids: List[str]) -> None:
        now = datetime.now(timezone.utc)
        self.client.table("feed_snapshot").insert({
            "generated_at": now.isoformat(),
            "nio_ids": nio_ids,
            "expires_at": (now + timedelta(minutes=FEED_REFRESH_MINUTES)).isoformat(),
        }).execute()


def select_feed(candidates: List[Dict[str, Any]]) -> List[str]:
    selected: List[str] = []
    topic_counts: Dict[str, int] = {}

    for nio in candidates:
        if len(selected) >= FEED_SIZE:
            break
        topics = nio.get("topics") or ["General"]
        primary_topic = topics[0] if topics else "General"
        if topic_counts.get(primary_topic, 0) >= MAX_PER_TOPIC:
            continue
        selected.append(nio["id"])
        topic_counts[primary_topic] = topic_counts.get(primary_topic, 0) + 1

    # Backfill from remaining candidates if the per-topic cap left the
    # feed short of FEED_SIZE (better a full feed than a strict cap).
    if len(selected) < FEED_SIZE:
        for nio in candidates:
            if len(selected) >= FEED_SIZE:
                break
            if nio["id"] not in selected:
                selected.append(nio["id"])

    return selected


def run() -> None:
    store = SupabaseStore()
    candidates = store.fetch_candidates()
    if not candidates:
        logger.info("No eligible NIOs for the feed yet.")
        return

    feed_ids = select_feed(candidates)
    if not feed_ids:
        logger.info("Selection produced an empty feed.")
        return

    store.insert_snapshot(feed_ids)
    logger.info(f"Feed snapshot written: {len(feed_ids)} NIO(s).")


if __name__ == "__main__":
    run()
