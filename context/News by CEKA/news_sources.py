"""
news_sources.py - CEKA News Intelligence Engine: Source Registry
==================================================================
Real, verifiable source list only. No placeholder or invented domains.

Tiering:
  1 = official / primary institutional record (highest credibility_weight)
  2 = established mainstream media
  3 = digital-first media
  4 = social / discourse signal (lowest weight, corroboration-only,
      never sole source for a VERIFIED nio state)

credibility_weight feeds directly into the corroboration math in
news_fusion_relay.py. These are starting values - recalibrate per
source once you have retraction/accuracy history (see
Source Intelligence in the architecture doc), but ship with these.

Run this file directly to upsert the registry into Supabase:
    python news_sources.py
"""

import os
import sys
import json
import logging
from typing import Any, Dict, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [SOURCES] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

# ---------------------------------------------------------------------------
# TIER 1 - Official / institutional record
# ---------------------------------------------------------------------------
TIER_1_OFFICIAL: List[Dict[str, Any]] = [
    {"name": "Parliament of Kenya", "domain": "parliament.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 1.000},
    {"name": "Kenya Law / Kenya Gazette", "domain": "kenyalaw.org", "tier": 1, "source_type": "official", "credibility_weight": 1.000},
    {"name": "The Judiciary of Kenya", "domain": "judiciary.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 1.000},
    {"name": "National Treasury", "domain": "treasury.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.980},
    {"name": "Central Bank of Kenya", "domain": "centralbank.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.980},
    {"name": "Kenya Revenue Authority", "domain": "kra.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.970},
    {"name": "IEBC", "domain": "iebc.or.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.970},
    {"name": "Ethics and Anti-Corruption Commission", "domain": "eacc.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.960},
    {"name": "Kenya National Bureau of Statistics", "domain": "knbs.or.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.970},
    {"name": "State House Kenya", "domain": "statehousekenya.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.950},
    {"name": "Office of the Auditor-General", "domain": "oagkenya.go.ke", "tier": 1, "source_type": "official", "credibility_weight": 0.970},
    {"name": "Mzalendo Watch", "domain": "mzalendo.com", "tier": 1, "source_type": "official", "credibility_weight": 0.900},
]

# ---------------------------------------------------------------------------
# TIER 2 - Established mainstream media
# ---------------------------------------------------------------------------
TIER_2_ESTABLISHED_MEDIA: List[Dict[str, Any]] = [
    {"name": "Nation Media Group / Daily Nation", "domain": "nation.africa", "tier": 2, "source_type": "established_media", "credibility_weight": 0.880},
    {"name": "The Standard", "domain": "standardmedia.co.ke", "tier": 2, "source_type": "established_media", "credibility_weight": 0.870},
    {"name": "The Star Kenya", "domain": "the-star.co.ke", "tier": 2, "source_type": "established_media", "credibility_weight": 0.850},
    {"name": "Business Daily Africa", "domain": "businessdailyafrica.com", "tier": 2, "source_type": "established_media", "credibility_weight": 0.870},
    {"name": "Capital FM News", "domain": "capitalfm.co.ke", "tier": 2, "source_type": "established_media", "credibility_weight": 0.830},
    {"name": "Citizen Digital", "domain": "citizen.digital", "tier": 2, "source_type": "established_media", "credibility_weight": 0.830},
    {"name": "Kenya Broadcasting Corporation", "domain": "kbc.co.ke", "tier": 2, "source_type": "established_media", "credibility_weight": 0.820},
    {"name": "People Daily", "domain": "pd.co.ke", "tier": 2, "source_type": "established_media", "credibility_weight": 0.800},
]

# ---------------------------------------------------------------------------
# TIER 3 - Digital-first media
# ---------------------------------------------------------------------------
TIER_3_DIGITAL_FIRST: List[Dict[str, Any]] = [
    {"name": "Kenyans.co.ke", "domain": "kenyans.co.ke", "tier": 3, "source_type": "digital_media", "credibility_weight": 0.700},
    {"name": "Tuko News", "domain": "tuko.co.ke", "tier": 3, "source_type": "digital_media", "credibility_weight": 0.680},
    {"name": "The Elephant", "domain": "theelephant.info", "tier": 3, "source_type": "digital_media", "credibility_weight": 0.750},
]

# ---------------------------------------------------------------------------
# TIER 4 - Social / discourse signal (corroboration only)
# ---------------------------------------------------------------------------
TIER_4_SOCIAL: List[Dict[str, Any]] = [
    {"name": "Reddit r/Kenya", "domain": "reddit.com/r/Kenya", "tier": 4, "source_type": "social", "credibility_weight": 0.350},
    {"name": "Reddit r/Nairobi", "domain": "reddit.com/r/Nairobi", "tier": 4, "source_type": "social", "credibility_weight": 0.350},
    {"name": "Amboko JH (X)", "domain": "x.com/AmbokoJH", "tier": 4, "source_type": "social", "credibility_weight": 0.450},
]

ALL_SOURCES: List[Dict[str, Any]] = (
    TIER_1_OFFICIAL + TIER_2_ESTABLISHED_MEDIA + TIER_3_DIGITAL_FIRST + TIER_4_SOCIAL
)


def export_json(path: str = "news_sources.json") -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ALL_SOURCES, f, indent=2, ensure_ascii=False)
    logger.info(f"Exported {len(ALL_SOURCES)} sources to {path}")


def upsert_to_supabase() -> None:
    try:
        from supabase import create_client
    except ImportError:
        logger.error("supabase-py not installed. pip install supabase")
        sys.exit(1)

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Cannot upsert - real data unavailable without credentials.")
        sys.exit(1)

    client = create_client(url, key)
    for source in ALL_SOURCES:
        try:
            client.table("news_sources").upsert(source, on_conflict="domain").execute()
            logger.info(f"Upserted: {source['name']} ({source['domain']})")
        except Exception as e:
            logger.error(f"Failed to upsert {source['name']}: {e}")


if __name__ == "__main__":
    export_json()
    upsert_to_supabase()
