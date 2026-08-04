"""
news_feed_api.py - CEKA News Intelligence Engine: Stage 8 (Serving)
=======================================================================
Two endpoints. This is the boundary the minimalist iOS-style UI sits
behind.

GET /feed
    Top civic_intel rows from `trending_cache`, most important first.
    -> [{id, headline, summary, url, importance, updated_at}, ...]

GET /nio/{nio_id}
    Full detail for the tap-through view: timeline, evidence, medium
    summary. Reads `nios` directly - migration_v2_real_schema.sql
    gives it the same public-read RLS policy your `bills` table
    already has, so the anon key can read it without going through a
    restricted view.

Run:
    pip install fastapi uvicorn supabase python-dotenv
    uvicorn news_feed_api:app --host 0.0.0.0 --port 8000

If your frontend already talks to Supabase directly (it does -
LegislativeTracker.tsx uses the supabase-js client throughout), you
likely don't need this file at all: query `trending_cache` and `nios`
client-side the same way the frontend already queries `bills` and
`bill_news_mentions`. This file exists only if you want one clean JSON
contract instead of client-side Supabase calls.
"""

import os
import logging
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [FEED-API] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

CONTENT_TYPE = "civic_intel"
FEED_LIMIT = int(os.getenv("FEED_API_LIMIT", "8"))

app = FastAPI(title="CEKA News Intelligence Feed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("FEED_API_CORS_ORIGINS", "https://civiceducationkenya.com").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _get_client():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    # anon key - this process is internet-facing, and RLS on
    # trending_cache / nios (migration_v2_real_schema.sql) already
    # matches what the frontend's own anon-key Supabase client can see.
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_ANON_KEY not set. real data unavailable.")
    return create_client(url, key)


@app.get("/feed")
def get_feed() -> List[Dict[str, Any]]:
    client = _get_client()
    res = (
        client.table("trending_cache")
        .select("content_id, title, excerpt, url, recency_score, tags, cached_at")
        .eq("content_type", CONTENT_TYPE)
        .order("recency_score", desc=True)
        .limit(FEED_LIMIT)
        .execute()
    )
    return [
        {
            "id": row["content_id"],
            "headline": row["title"],
            "summary": row["excerpt"],
            "url": row["url"],
            "importance": row["recency_score"],
            "topics": row.get("tags") or [],
            "updated_at": row["cached_at"],
        }
        for row in (res.data or [])
    ]


@app.get("/nio/{nio_id}")
def get_nio_detail(nio_id: str) -> Dict[str, Any]:
    client = _get_client()
    res = (
        client.table("nios")
        .select("id, canonical_headline, summary_short, summary_medium, state, importance, timeline, topics, related_bill_id, updated_at")
        .eq("id", nio_id)
        .in_("state", ["verified", "developing", "stable"])
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="NIO not found or not public.")
    row = res.data[0]
    return {
        "id": row["id"],
        "headline": row["canonical_headline"],
        "summary_short": row["summary_short"],
        "summary_medium": row["summary_medium"],
        "state": row["state"],
        "importance": row["importance"],
        "timeline": row["timeline"],
        "topics": row["topics"],
        "related_bill_id": row["related_bill_id"],
        "updated_at": row["updated_at"],
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
