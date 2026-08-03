"""
run_news_pipeline.py - CEKA News Intelligence Engine: Entrypoint
=====================================================================
Runs all stages in sequence. Point one GitHub Actions cron (or your
existing scheduler) at this file. Each stage is independently
resilient - one stage failing logs and continues rather than aborting
the run, matching the pattern in your existing legislative pipeline
scripts.

Pipeline stages:
  1. Collection     — RSS + direct-HTML signals → `signals` table
  2. Enrichment     — Story DNA + entities + embeddings via MultiLLM
  3. Fusion         — Event deduplication, corroboration, state machine
  4. Headline Gen   — Canonical headlines + summaries for verified NIOs
  5. Feed Synthesis — Ranked `feed_snapshot` written for the frontend

Suggested cadence (adjust via your cron schedule, not inside this
file): collection every 5-10 minutes, enrichment + fusion every
10-15 minutes, headline generation every 15-20 minutes, feed
synthesis every 5-10 minutes. If you want independent cadences,
call each stage's script directly instead of this file - this
entrypoint is for a single combined cron run.

Run:
    python run_news_pipeline.py
"""

import logging
import os
import sys
import traceback

# Ensure this directory is on the path so sibling modules resolve
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [PIPELINE] - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def _run_stage(name: str, fn) -> bool:
    logger.info("=" * 70)
    logger.info(f"  STAGE: {name}")
    logger.info("=" * 70)
    try:
        fn()
        return True
    except Exception as e:
        logger.error(f"Stage '{name}' failed: {e}")
        logger.error(traceback.format_exc())
        return False


def main() -> None:
    import news_collector
    import news_enrichment
    import news_fusion_relay
    import news_headline_engine
    import news_feed_synthesis

    results = {
        "collection":     _run_stage("Collection",          lambda: news_collector.NewsCollector().run()),
        "enrichment":     _run_stage("Enrichment",          news_enrichment.run),
        "fusion":         _run_stage("Fusion",              lambda: news_fusion_relay.FusionRelay().run()),
        "headlines":      _run_stage("Headline Generation", news_headline_engine.run),
        "feed_synthesis": _run_stage("Feed Synthesis",      news_feed_synthesis.run),
    }

    logger.info("=" * 70)
    logger.info("  PIPELINE RUN SUMMARY")
    for stage, success in results.items():
        logger.info(f"    {stage}: {'OK' if success else 'FAILED'}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
