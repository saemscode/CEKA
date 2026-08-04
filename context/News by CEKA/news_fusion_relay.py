"""
news_fusion_relay.py - CEKA News Intelligence Engine: Stage 3-5
=====================================================================
Event Fusion + Corroboration + State Machine.

Structured the same way as your existing deep_intelligence_relay.py:
a crash-safe loop that commits state after every single unit of work,
guarded by the same `pipeline_locks` table your legislative
news-intel script already uses, so a killed run resumes cleanly and
two runs never race each other.

What is deterministic (no LLM call): corroboration scoring, state
transitions, velocity, importance. This is intentional - see the
architecture discussion: math, not AI, for anything that determines
whether a story is trustworthy enough to publish.

What uses an LLM: only the ambiguous-match disambiguation band
(cosine 0.75-0.90), via your existing MultiLLMOrchestrator, mirroring
the exact 3-key cascade already in _join_tracker_row_to_bill
(exact match -> fuzzy/embedding match -> LLM tiebreak for the
middle band only).

pip install supabase python-dotenv numpy
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [FUSION] - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("news_fusion_relay.log", encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from multi_llm_orchestrator import MultiLLMOrchestrator  # your existing module

FUSION_MAX_SIGNALS_PER_RUN = int(os.getenv("FUSION_MAX_SIGNALS_PER_RUN", "150"))
FUSION_BUDGET_SECONDS = int(os.getenv("FUSION_BUDGET_SECONDS", "3600"))
LOCK_TYPE = "news_fusion_relay"
LOCK_STALE_SECONDS = 7200

AUTO_MATCH_THRESHOLD = 0.90
AMBIGUOUS_LOW = 0.75
AMBIGUOUS_HIGH = 0.90
NEW_NIO_CONFIDENCE_FLOOR = 5.0

STATE_ORDER = ["detected", "emerging", "corroborating", "verified", "developing", "stable", "historical"]

STABLE_AFTER_HOURS = 6
HISTORICAL_AFTER_DAYS = 14
DAILY_CONFIDENCE_DECAY = 0.97  # multiplicative, applied once per day of silence

DISAMBIGUATION_SYSTEM_PROMPT = (
    "You are a deduplication judge for a Kenyan civic news intelligence system. "
    "You will be shown two short story summaries. Reply with exactly one word: YES if they "
    "describe the same real-world news event, NO if they are different events (even if related "
    "or on the same broad topic). No explanation."
)


def _cosine(a: List[float], b: List[float]) -> float:
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


class SupabaseStore:
    def __init__(self):
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. real data unavailable.")
        self.client = create_client(url, key)

    # ---- locking ----------------------------------------------------
    def acquire_lock(self) -> bool:
        try:
            existing = self.client.table("pipeline_locks").select("*").eq("lock_type", LOCK_TYPE).execute()
            if existing.data:
                lock_time = datetime.fromisoformat(existing.data[0]["created_at"].replace("Z", "+00:00"))
                age = (datetime.now(timezone.utc) - lock_time).total_seconds()
                if age < LOCK_STALE_SECONDS:
                    return False
            self.client.table("pipeline_locks").upsert(
                {"lock_type": LOCK_TYPE, "created_at": datetime.now(timezone.utc).isoformat()}
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Lock acquisition failed: {e}")
            return False

    def release_lock(self) -> None:
        try:
            self.client.table("pipeline_locks").delete().eq("lock_type", LOCK_TYPE).execute()
        except Exception as e:
            logger.warning(f"Lock release failed (non-fatal): {e}")

    # ---- signals ------------------------------------------------------
    def fetch_pending_signals(self, limit: int) -> List[Dict[str, Any]]:
        res = (
            self.client.table("bill_news_mentions")
            .select("id, source_id, bill_id, article_url, headline, clean_content, embedding, story_dna, entities, claims, article_date, scraped_at")
            .eq("enrichment_status", "enriched")
            .eq("fusion_status", "pending")
            .order("scraped_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []

    def mark_signal_fused(self, signal_id: str, nio_id: str) -> None:
        self.client.table("bill_news_mentions").update(
            {"fusion_status": "fused", "matched_nio_id": nio_id}
        ).eq("id", signal_id).execute()

    def mark_signal_failed(self, signal_id: str) -> None:
        self.client.table("bill_news_mentions").update({"fusion_status": "failed"}).eq("id", signal_id).execute()

    def get_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("scraper_sources").select("*").eq("id", source_id).limit(1).execute()
        return res.data[0] if res.data else None

    # ---- nios -----------------------------------------------------
    def fetch_candidate_nios(self, since_hours: int = 72, limit: int = 500) -> List[Dict[str, Any]]:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=since_hours)).isoformat()
        res = (
            self.client.table("nios")
            .select("id, embedding, story_dna, state, confidence, importance, velocity, evidence, timeline, topics, last_signal_at")
            .neq("state", "historical")
            .gte("last_signal_at", cutoff)
            .limit(limit)
            .execute()
        )
        return res.data or []

    def insert_nio(self, nio: Dict[str, Any]) -> str:
        res = self.client.table("nios").insert(nio).execute()
        return res.data[0]["id"]

    def update_nio(self, nio_id: str, update: Dict[str, Any]) -> None:
        self.client.table("nios").update(update).eq("id", nio_id).execute()

    def fetch_stale_nios(self, limit: int = 500) -> List[Dict[str, Any]]:
        res = (
            self.client.table("nios")
            .select("id, state, confidence, last_signal_at")
            .in_("state", ["detected", "emerging", "corroborating", "verified", "developing", "stable"])
            .order("last_signal_at", desc=False)
            .limit(limit)
            .execute()
        )
        return res.data or []


def _match_signal_to_nio(
    signal: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    orchestrator: MultiLLMOrchestrator,
) -> Optional[str]:
    """3-key cascade, mirroring _join_tracker_row_to_bill:
    1. cosine >= AUTO_MATCH_THRESHOLD -> auto match
    2. AMBIGUOUS_LOW <= cosine < AUTO_MATCH_THRESHOLD -> LLM tiebreak
    3. below AMBIGUOUS_LOW -> no match, caller creates a new NIO
    """
    signal_embedding = signal.get("embedding")
    if not signal_embedding:
        return None

    best_score = 0.0
    best_nio = None
    for nio in candidates:
        nio_embedding = nio.get("embedding")
        if not nio_embedding:
            continue
        score = _cosine(signal_embedding, nio_embedding)
        if score > best_score:
            best_score = score
            best_nio = nio

    if best_nio is None:
        return None

    if best_score >= AUTO_MATCH_THRESHOLD:
        logger.info(f"    Auto-match (cosine={best_score:.3f}) -> NIO {best_nio['id']}")
        return best_nio["id"]

    if AMBIGUOUS_LOW <= best_score < AMBIGUOUS_HIGH:
        prompt = (
            f"Story A (candidate event):\n{json.dumps(best_nio.get('story_dna') or {}, ensure_ascii=False)}\n\n"
            f"Story B (new signal):\n{json.dumps(signal.get('story_dna') or {}, ensure_ascii=False)}\n\n"
            "Same real-world event? Reply YES or NO."
        )
        answer = orchestrator.synthesize(prompt, DISAMBIGUATION_SYSTEM_PROMPT)
        if answer and answer.strip().upper().startswith("YES"):
            logger.info(f"    LLM-confirmed match (cosine={best_score:.3f}) -> NIO {best_nio['id']}")
            return best_nio["id"]
        logger.info(f"    LLM-rejected match (cosine={best_score:.3f})")
        return None

    return None


def _compute_confidence(evidence: List[Dict[str, Any]]) -> float:
    """Noisy-OR combination over distinct sources: each independent
    corroborating source raises confidence; no single source, however
    credible, can alone reach 100."""
    seen_sources: Dict[str, float] = {}
    for e in evidence:
        sid = e.get("source_id")
        w = float(e.get("credibility_weight", 0.5))
        if sid not in seen_sources or w > seen_sources[sid]:
            seen_sources[sid] = w
    if not seen_sources:
        return NEW_NIO_CONFIDENCE_FLOOR
    product_not_confirmed = 1.0
    for w in seen_sources.values():
        product_not_confirmed *= (1.0 - w)
    return round(max(NEW_NIO_CONFIDENCE_FLOOR, 100.0 * (1.0 - product_not_confirmed)), 2)


def _compute_velocity(evidence: List[Dict[str, Any]]) -> float:
    now = datetime.now(timezone.utc)
    recent = 0
    for e in evidence:
        ts = e.get("captured_at")
        if not ts:
            continue
        try:
            t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            continue
        if (now - t).total_seconds() <= 3600:
            recent += 1
    return round(min(100.0, recent * 20.0), 2)


def _compute_importance(evidence: List[Dict[str, Any]], distinct_sources: int, has_tier1: bool, avg_citizen_impact: float) -> float:
    score = (avg_citizen_impact * 0.6) + (distinct_sources * 8.0) + (20.0 if has_tier1 else 0.0)
    return round(min(100.0, score), 2)


def _next_state(current_state: str, confidence: float, distinct_sources: int, distinct_tier_leq2: int) -> str:
    idx = STATE_ORDER.index(current_state) if current_state in STATE_ORDER else 0
    target = "detected"
    if distinct_sources >= 1:
        target = "detected"
    if distinct_sources >= 1 and confidence >= 40:
        target = "emerging"
    if distinct_sources >= 2 and distinct_tier_leq2 >= 1 and confidence >= 60:
        target = "corroborating"
    if distinct_tier_leq2 >= 2 and confidence >= 85:
        target = "verified"
    if current_state in ("verified", "developing") and target == "verified":
        target = "developing"  # already verified and receiving further evidence

    target_idx = STATE_ORDER.index(target)
    # Forward-only, same rule as the bill tracker's STATUS_ORDER advancement.
    return target if target_idx > idx else current_state


class FusionRelay:
    def __init__(self):
        self.store = SupabaseStore()
        self.orchestrator = MultiLLMOrchestrator()

    def _build_evidence_entry(self, signal: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
        # These are internal keys for the evidence entry stored inside
        # nios.evidence (jsonb) - not column names, so they stay
        # "url" / "title" / "captured_at" regardless of what
        # bill_news_mentions calls the equivalent columns.
        return {
            "signal_id": signal["id"],
            "source_id": source["id"],
            "source_name": source.get("name"),
            "source_domain": source.get("domain"),
            "source_tier": source.get("tier"),
            "credibility_weight": float(source.get("credibility_weight") or 0.5),
            "url": signal.get("article_url"),
            "title": signal.get("headline"),
            "captured_at": signal.get("scraped_at"),
        }

    def _build_timeline_entry(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "time": signal.get("article_date") or signal.get("scraped_at"),
            "event": signal.get("headline"),
            "source_signal_id": signal["id"],
        }

    def process_signal(self, signal: Dict[str, Any], candidates: List[Dict[str, Any]]) -> Optional[str]:
        source = self.store.get_source(signal["source_id"])
        if not source:
            logger.warning(f"No source row for signal {signal['id']}. Skipping.")
            return None

        matched_nio_id = _match_signal_to_nio(signal, candidates, self.orchestrator)
        nio = None

        if matched_nio_id:
            nio = next((n for n in candidates if n["id"] == matched_nio_id), None)
            if nio is None:
                matched_nio_id = None

        evidence_entry = self._build_evidence_entry(signal, source)
        timeline_entry = self._build_timeline_entry(signal)

        if matched_nio_id and nio is not None:
            evidence = list(nio.get("evidence") or []) + [evidence_entry]
            timeline = list(nio.get("timeline") or []) + [timeline_entry]
            distinct_sources = len({e["source_id"] for e in evidence})
            distinct_tier_leq2 = len({e["source_id"] for e in evidence if (e.get("source_tier") or 9) <= 2})
            has_tier1 = any((e.get("source_tier") == 1) for e in evidence)
            confidence = _compute_confidence(evidence)
            velocity = _compute_velocity(evidence)

            citizen_impact = float((signal.get("story_dna") or {}).get("citizen_impact_score", 0) or 0)
            importance = _compute_importance(evidence, distinct_sources, has_tier1, citizen_impact)

            new_state = _next_state(nio["state"], confidence, distinct_sources, distinct_tier_leq2)

            new_embedding = signal.get("embedding")
            merged_embedding = nio.get("embedding")
            if new_embedding and merged_embedding:
                merged_embedding = list(np.mean([np.array(merged_embedding), np.array(new_embedding)], axis=0))
            elif new_embedding:
                merged_embedding = new_embedding

            nio_update: Dict[str, Any] = {
                "evidence": evidence,
                "timeline": timeline,
                "confidence": confidence,
                "velocity": velocity,
                "importance": importance,
                "state": new_state,
                "embedding": merged_embedding,
                "last_signal_at": signal.get("scraped_at"),
            }
            # Carry a bill_id forward onto the NIO once, if this signal
            # came from your existing bill-tied scraper and the NIO
            # doesn't already point at a bill.
            if signal.get("bill_id") and not nio.get("related_bill_id"):
                nio_update["related_bill_id"] = signal["bill_id"]

            self.store.update_nio(matched_nio_id, nio_update)
            logger.info(f"    Merged into NIO {matched_nio_id}: state={new_state} confidence={confidence}")
            return matched_nio_id

        # No match - create a new NIO
        evidence = [evidence_entry]
        timeline = [timeline_entry]
        confidence = _compute_confidence(evidence)
        velocity = _compute_velocity(evidence)
        citizen_impact = float((signal.get("story_dna") or {}).get("citizen_impact_score", 0) or 0)
        distinct_tier_leq2 = 1 if (evidence_entry.get("source_tier") or 9) <= 2 else 0
        has_tier1 = evidence_entry.get("source_tier") == 1
        importance = _compute_importance(evidence, 1, has_tier1, citizen_impact)

        new_nio = {
            "canonical_headline": signal.get("headline"),
            "state": "detected",
            "confidence": confidence,
            "importance": importance,
            "velocity": velocity,
            "story_dna": signal.get("story_dna"),
            "summary_short": None,
            "summary_medium": None,
            "timeline": timeline,
            "evidence": evidence,
            "topics": (signal.get("story_dna") or {}).get("topics", []) or [],
            "embedding": signal.get("embedding"),
            "last_signal_at": signal.get("scraped_at"),
        }
        nio_id = self.store.insert_nio(new_nio)
        logger.info(f"    Created new NIO {nio_id} from signal {signal['id']}")
        return nio_id

    def decay_stale_nios(self) -> None:
        stale = self.store.fetch_stale_nios()
        now = datetime.now(timezone.utc)
        for nio in stale:
            last_signal = nio.get("last_signal_at")
            if not last_signal:
                continue
            try:
                last_dt = datetime.fromisoformat(last_signal.replace("Z", "+00:00"))
            except Exception:
                continue
            silent_hours = (now - last_dt).total_seconds() / 3600.0
            silent_days = silent_hours / 24.0

            update: Dict[str, Any] = {}
            if silent_days >= HISTORICAL_AFTER_DAYS:
                update["state"] = "historical"
            elif silent_hours >= STABLE_AFTER_HOURS and nio["state"] in ("verified", "developing"):
                update["state"] = "stable"

            if silent_days >= 1:
                decayed = round(float(nio["confidence"]) * (DAILY_CONFIDENCE_DECAY ** silent_days), 2)
                update["confidence"] = max(decayed, NEW_NIO_CONFIDENCE_FLOOR)
                update["confidence_decayed_at"] = now.isoformat()

            if update:
                self.store.update_nio(nio["id"], update)

    def run(self) -> None:
        if not self.store.acquire_lock():
            logger.warning("Fusion relay already locked by another run. Exiting.")
            return
        try:
            pending = self.store.fetch_pending_signals(FUSION_MAX_SIGNALS_PER_RUN)
            if not pending:
                logger.info("No enriched signals pending fusion.")
            else:
                logger.info(f"Fusing {len(pending)} signal(s). Budget: {FUSION_BUDGET_SECONDS}s")
                candidates = self.store.fetch_candidate_nios()
                start = time.time()
                ok, failed = 0, 0

                for i, signal in enumerate(pending):
                    if time.time() - start >= FUSION_BUDGET_SECONDS:
                        logger.info(f"Budget reached. Processed {i}/{len(pending)}. Remaining stay pending.")
                        break
                    try:
                        nio_id = self.process_signal(signal, candidates)
                        if nio_id:
                            self.store.mark_signal_fused(signal["id"], nio_id)
                            ok += 1
                            # Refresh local candidate cache entry so subsequent
                            # signals in this same run see the latest merge.
                            candidates = [c for c in candidates if c["id"] != nio_id]
                            refreshed = self.store.fetch_candidate_nios()
                            candidates = refreshed
                        else:
                            self.store.mark_signal_failed(signal["id"])
                            failed += 1
                    except Exception as e:
                        logger.error(f"Fusion error on signal {signal.get('id')}: {e}")
                        self.store.mark_signal_failed(signal["id"])
                        failed += 1

                logger.info(f"Fusion run complete. OK={ok} Failed={failed}")

            self.decay_stale_nios()
        finally:
            self.store.release_lock()


if __name__ == "__main__":
    relay = FusionRelay()
    relay.run()
