"""
news_feed_synthesis.py - CEKA News Intelligence Engine: Stage 7
=====================================================================
Reads VERIFIED+ NIOs, ranks by importance, caps redundancy per topic,
upserts into `trending_cache` (your existing table - extended with a
unique index on (content_id, content_type) by migration_v2_real_schema.sql,
and given a public-read RLS policy it didn't have before, since it was
RLS-enabled with zero policies and therefore unreadable by anon/authenticated).

content_type = 'civic_intel' distinguishes these rows from whatever
else already writes to trending_cache. Rows for NIOs that fall out of
the top selection (state changed, importance dropped, or state
advanced to 'historical') are deleted so the cache doesn't accumulate
stale headlines.

Run this on a short cron interval (every 2-5 minutes is reasonable).

pip install supabase python-dotenv
"""

import os
import logging
from datetime import datetime, timezone
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
CANDIDATE_POOL_SIZE = int(os.getenv("FEED_CANDIDATE_POOL_SIZE", "100"))
CONTENT_TYPE = "civic_intel"


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
            .select("id, canonical_headline, summary_short, importance, topics, related_bill_id, created_at")
            .in_("state", ["verified", "developing", "stable"])
            .not_.is_("canonical_headline", "null")
            .order("importance", desc=True)
            .limit(CANDIDATE_POOL_SIZE)
            .execute()
        )
        return res.data or []

    def upsert_feed_rows(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            return
        self.client.table("trending_cache").upsert(rows, on_conflict="content_id,content_type").execute()

    def prune_stale(self, keep_ids: List[str]) -> None:
        query = self.client.table("trending_cache").delete().eq("content_type", CONTENT_TYPE)
        if keep_ids:
            query = query.not_.in_("content_id", keep_ids)
        query.execute()


def select_feed(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    selected: List[Dict[str, Any]] = []
    topic_counts: Dict[str, int] = {}

    for nio in candidates:
        if len(selected) >= FEED_SIZE:
            break
        topics = nio.get("topics") or ["General"]
        primary_topic = topics[0] if topics else "General"
        if topic_counts.get(primary_topic, 0) >= MAX_PER_TOPIC:
            continue
        selected.append(nio)
        topic_counts[primary_topic] = topic_counts.get(primary_topic, 0) + 1

    # Backfill from remaining candidates if the per-topic cap left the
    # feed short of FEED_SIZE (better a full feed than a strict cap).
    if len(selected) < FEED_SIZE:
        selected_ids = {n["id"] for n in selected}
        for nio in candidates:
            if len(selected) >= FEED_SIZE:
                break
            if nio["id"] not in selected_ids:
                selected.append(nio)
                selected_ids.add(nio["id"])

    return selected


def _to_trending_row(nio: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "content_id": nio["id"],
        "content_type": CONTENT_TYPE,
        "title": nio.get("canonical_headline"),
        "excerpt": nio.get("summary_short"),
        "tags": nio.get("topics") or [],
        "created_at": nio.get("created_at"),
        # get_bill_by_slug_or_id() accepts either a slug or a raw id,
        # so linking straight to the bill's uuid is safe even without
        # fetching its slug here.
        "url": f"/bill/{nio['related_bill_id']}" if nio.get("related_bill_id") else None,
        "recency_score": float(nio.get("importance") or 0),
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }


def run() -> None:
    store = SupabaseStore()
    candidates = store.fetch_candidates()
    if not candidates:
        logger.info("No eligible NIOs for the feed yet.")
        return

    feed_nios = select_feed(candidates)
    if not feed_nios:
        logger.info("Selection produced an empty feed.")
        return

    rows = [_to_trending_row(n) for n in feed_nios]
    store.upsert_feed_rows(rows)
    store.prune_stale([n["id"] for n in feed_nios])
    logger.info(f"Feed synced to trending_cache: {len(rows)} NIO(s).")


if __name__ == "__main__":
    run()
