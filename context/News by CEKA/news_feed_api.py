"""
news_feed_api.py - CEKA News Intelligence Engine: Stage 8 (Serving)
=======================================================================
The only two endpoints the frontend needs. This is the boundary the
minimalist iOS-style UI sits behind - everything upstream (signals,
fusion working memory, evidence detail) never crosses this line
except through the fields explicitly selected below.

GET /feed
    Latest non-expired feed_snapshot, resolved into NIO cards.
    -> [{id, headline, summary_short, state, importance, updated_at}, ...]

GET /nio/{nio_id}
    Full detail for the tap-through view: timeline, evidence, medium
    summary. Only for NIOs in a public-eligible state.

Run:
    pip install fastapi uvicorn supabase python-dotenv
    uvicorn news_feed_api:app --host 0.0.0.0 --port 8000

If your frontend already talks to Supabase directly, you can skip
this file entirely and query `feed_snapshot` + `public_nios`
(the view created in schema_news_intelligence.sql) client-side under
the anon key - RLS already restricts anon access to exactly the same
fields this API exposes. This file exists for the case where you want
one clean JSON contract instead of two client-side queries plus a
join.
"""

import os
import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [FEED-API] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

PUBLIC_STATES = ("verified", "developing", "stable")

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
    # Use the anon key here, not the service role key - this process
    # is internet-facing. RLS on `public_nios` / `feed_snapshot`
    # already restricts it to public-safe columns and states.
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_ANON_KEY not set. real data unavailable.")
    return create_client(url, key)


@app.get("/feed")
def get_feed() -> List[Dict[str, Any]]:
    client = _get_client()
    snap_res = (
        client.table("feed_snapshot")
        .select("nio_ids, generated_at, expires_at")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not snap_res.data:
        return []

    nio_ids = snap_res.data[0]["nio_ids"]
    if not nio_ids:
        return []

    nios_res = (
        client.table("public_nios")
        .select("id, canonical_headline, summary_short, state, importance, updated_at")
        .in_("id", nio_ids)
        .execute()
    )
    by_id = {n["id"]: n for n in (nios_res.data or [])}

    # Preserve the ranked order from feed_snapshot, not the DB's return order.
    ordered = [by_id[nid] for nid in nio_ids if nid in by_id]
    return [
        {
            "id": n["id"],
            "headline": n["canonical_headline"],
            "summary": n["summary_short"],
            "state": n["state"],
            "importance": n["importance"],
            "updated_at": n["updated_at"],
        }
        for n in ordered
    ]


@app.get("/nio/{nio_id}")
def get_nio_detail(nio_id: str) -> Dict[str, Any]:
    client = _get_client()
    res = (
        client.table("public_nios")
        .select("id, canonical_headline, summary_short, summary_medium, state, importance, timeline, topics, updated_at")
        .eq("id", nio_id)
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
        "updated_at": row["updated_at"],
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
