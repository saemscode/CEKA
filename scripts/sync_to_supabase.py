import os
import sys
import json
import logging
import re
import argparse
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise EnvironmentError("Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
    return create_client(url, key)


def normalize_title(title: str) -> str:
    t = title.lower()
    # IMPORTANT: do NOT strip 'amendment' — it distinguishes e.g.
    # 'Finance Bill 2026' from 'Finance (Amendment) Bill 2026'
    # IMPORTANT: do NOT strip years — 'Finance Bill 2024' and 'Finance Bill 2025'
    # must normalize to DIFFERENT keys so they INSERT as separate rows, not overwrites.
    # The year-aware guard in find_existing_bill() only works when the year is preserved here.
    t = re.sub(r'\b(the|bill|no|of|copy|senate|national|assembly|gazette)\b', '', t)
    t = re.sub(r'[^\w\s]', '', t)
    return " ".join(t.split()).strip()


def generate_slug(title: str) -> str:
    """
    Generate a URL-safe slug from a bill title.
    Example: "The Sacco Societies (Amendment) Bill 2025" -> "sacco-societies-amendment-bill-2025"
    """
    slug = title.lower()
    # Remove parentheses but keep the words inside
    slug = re.sub(r'[()]', '', slug)
    # Replace non-alphanumeric characters (except spaces and hyphens) with space
    slug = re.sub(r'[^\w\s-]', ' ', slug)
    # Collapse whitespace and replace with hyphens
    slug = re.sub(r'[\s_]+', '-', slug.strip())
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Collapse consecutive hyphens
    slug = re.sub(r'-{2,}', '-', slug)
    return slug


def find_existing_bill(supabase: Client, item: Dict, v2_supported: bool) -> Optional[Dict[str, Any]]:
    bill_no = item.get("bill_no")
    title = item.get("title", "")
    normalized = normalize_title(title)

    if v2_supported and bill_no:
        try:
            res = supabase.table("bills").select("*").eq("bill_no", bill_no).maybe_single().execute()
            if res and res.data:
                return res.data
        except Exception as e:
            logging.warning(f"⚠️ Bill No lookup failed for '{bill_no}': {e}")

    try:
        res = supabase.table("bills").select("*").eq("title", title).maybe_single().execute()
        if res and res.data:
            return res.data
    except Exception:
        pass

    first_word = title.split()[0] if title.split() else ""
    if len(first_word) > 3:
        try:
            candidates = supabase.table("bills").select("*").ilike("title", f"{first_word}%").execute()
            for cand in (candidates.data or []):
                if normalize_title(cand['title']) == normalized:
                    cand_year_match = re.search(r'\b(20\d{2})\b', cand['title'])
                    item_year_match = re.search(r'\b(20\d{2})\b', title)
                    if cand_year_match and item_year_match:
                        if cand_year_match.group(1) != item_year_match.group(1):
                            continue
                    return cand
        except Exception:
            pass
    return None


def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value


def record_scrape_run(supabase: Client, stats: Dict[str, int], source: str):
    try:
        data = {
            "source": source,
            "bills_found": stats['bills'] + stats['updates'] + stats.get('order_papers', 0),
            "bills_inserted": stats['bills'],
            "bills_updated": stats['updates'],
            "completed_at": datetime.now().isoformat(),
            "started_at": datetime.now().isoformat()
        }
        supabase.table("scrape_runs").insert(data).execute()
        logging.info("📊 Run logged to scrape_runs table.")
    except Exception as e:
        logging.error(f"⚠️ Failed to log run: {e}")


def check_schema_support(supabase: Client):
    try:
        supabase.table("bills").select("bill_no").limit(1).execute()
        return True
    except Exception:
        return False


_BILLS_COLUMNS_CACHE: set = set()

def get_bills_columns(supabase: Client) -> set:
    """Probe the live schema and return the set of column names that actually exist
    in the `bills` table. Results are cached for the lifetime of this process so
    only one round-trip is made per invocation.

    This is the fix for PGRST204 'column not found in schema cache' — the scripts
    reference columns that were added to the codebase but not yet migrated to the
    live DB (sponsor_title, assent_date, first_reading_date, etc.). By probing
    once at startup and filtering every payload through this allowlist we:
      - Never send a column that doesn't exist → no more 400 errors
      - Automatically start sending new columns the moment the migration is applied
      - Require no code changes when the DB schema evolves
    """
    global _BILLS_COLUMNS_CACHE
    if _BILLS_COLUMNS_CACHE:
        return _BILLS_COLUMNS_CACHE
    try:
        # Fetch a single row with all columns — the column names returned by
        # PostgREST tell us exactly what the schema cache knows about.
        res = supabase.table("bills").select("*").limit(1).execute()
        if res.data:
            _BILLS_COLUMNS_CACHE = set(res.data[0].keys())
        else:
            # No rows yet — do a HEAD-style probe by inserting nothing and
            # reading the error. Fallback: use a known-safe minimal set.
            _BILLS_COLUMNS_CACHE = {
                "id", "title", "slug", "sponsor", "status", "category",
                "date", "url", "pdf_url", "text_content", "description",
                "summary", "updated_at", "created_at", "bill_no",
                "session_year", "b2_url", "ai_concerns",
                "constitutional_section", "tabloid_summary", "neural_summary",
                "corroboration_score", "verified_sources", "analysis_status",
                "stages", "house", "history", "status_lock",
            }
        logging.info(f"[Schema] bills columns detected: {sorted(_BILLS_COLUMNS_CACHE)}")
    except Exception as e:
        logging.warning(f"[Schema] Could not probe bills columns: {e}. Will attempt writes anyway.")
        _BILLS_COLUMNS_CACHE = set()  # Empty = no filtering (old behaviour)
    return _BILLS_COLUMNS_CACHE


def _filter_payload(payload: dict, allowed_cols: set) -> dict:
    """Remove any keys from payload that are not in allowed_cols.
    If allowed_cols is empty (probe failed) the payload is returned unchanged."""
    if not allowed_cols:
        return payload
    filtered = {k: v for k, v in payload.items() if k in allowed_cols}
    dropped = set(payload.keys()) - set(filtered.keys())
    if dropped:
        logging.debug(f"[Schema] Dropped unknown columns from payload: {sorted(dropped)}")
    return filtered

def sync_data(input_file: Optional[str] = None, output_dir: str = "processed_data/legislative"):
    load_env()
    supabase = get_supabase_client()

    # If a specific file is provided, use it
    if input_file:
        if not os.path.exists(input_file):
            logging.error(f"❌ Specified file not found: {input_file}")
            return
        files_to_sync = [input_file]
    else:
        if not os.path.exists(output_dir):
            logging.error(f"❌ Hub directory missing: {output_dir}")
            return
        all_files = sorted([
            os.path.join(output_dir, f)
            for f in os.listdir(output_dir)
            if f.startswith('legislation_sync_') and f.endswith('.json')
        ])
        if not all_files:
            logging.warning("⚠️ No fresh neural data hub files found.")
            return

        # Track already-synced files using a sentinel tracker
        synced_tracker_path = os.path.join(output_dir, ".synced_files.json")
        already_synced = set()
        try:
            if os.path.exists(synced_tracker_path):
                with open(synced_tracker_path, 'r') as tf:
                    already_synced = set(json.load(tf))
        except Exception:
            pass

        # Process all files not yet synced (up to 5 at a time to avoid timeouts)
        files_to_sync = [f for f in all_files if f not in already_synced][-5:]
        if not files_to_sync:
            logging.info("✅ All legislation_sync_*.json files already synced — nothing new to process.")
            return
        logging.info(f"📂 Found {len(files_to_sync)} unsynced file(s) to process (of {len(all_files)} total).")

    stats = {"bills": 0, "updates": 0, "order_papers": 0, "failed": 0}
    v2_supported = check_schema_support(supabase)
    bills_cols   = get_bills_columns(supabase)
    synced_now = []

    for latest_file in files_to_sync:
        logging.info(f"🚀 Ingesting: {latest_file}")
        try:
            with open(latest_file, 'r', encoding='utf-8') as f:
                items = json.load(f)
        except Exception as e:
            logging.error(f"❌ Failed to read {latest_file}: {e}")
            continue

        if not items:
            logging.warning(f"⚠️ Empty file: {latest_file}")
            synced_now.append(latest_file)
            continue

        source_name = items[0].get("source", "Parliamentary Portal")
        file_stats = {"bills": 0, "updates": 0, "order_papers": 0, "failed": 0}

        for item in items:
            try:
                category = item.get("category")

                if category == "Order Paper":
                    if not v2_supported:
                        continue
                    data = {
                        "title": item.get("title"),
                        "house": item.get("house"),
                        "pdf_url": item.get("url"),
                        "source": item.get("source"),
                        "metadata": item.get("metadata", {}),
                        "date": item.get("date")
                    }
                    supabase.table("order_papers").upsert(data, on_conflict="title").execute()
                    file_stats["order_papers"] += 1
                    stats["order_papers"] += 1
                    continue

                existing = find_existing_bill(supabase, item, v2_supported)

                new_data = {
                    "title": item.get("title"),
                    "slug": item.get("slug") or generate_slug(item.get("title", "")),
                    "sponsor": item.get("sponsor"),
                    "status": item.get("status"),
                    "category": item.get("category"),
                    "date": item.get("date"),
                    "url": item.get("url"),
                    "pdf_url": item.get("pdf_url"),
                    "text_content": item.get("text_content"),
                    "description": item.get("description"),
                    "summary": item.get("summary") or f"Legislative tracker: {item.get('title')}",
                    "updated_at": datetime.now().isoformat()
                }

                # Backfill slug for existing records that don't have one yet
                if existing and not existing.get("slug") and new_data.get("slug"):
                    logging.info(f"🔗 Backfilling slug for existing: {item['title']} → {new_data['slug']}")

                if v2_supported:
                    if item.get("bill_no"):
                        new_data["bill_no"] = item.get("bill_no")
                    if item.get("session_year"):
                        new_data["session_year"] = item.get("session_year")

                if item.get("b2_url"):
                    new_data["b2_url"] = item.get("b2_url")
                if item.get("ai_concerns"):
                    new_data["ai_concerns"] = item.get("ai_concerns")
                if item.get("constitutional_section"):
                    new_data["constitutional_section"] = item.get("constitutional_section")
                if item.get("tabloid_summary"):
                    new_data["tabloid_summary"] = item.get("tabloid_summary")
                if item.get("neural_summary"):
                    new_data["neural_summary"] = item.get("neural_summary")
                if item.get("corroboration_score"):
                    new_data["corroboration_score"] = item.get("corroboration_score")
                if item.get("verified_sources"):
                    new_data["verified_sources"] = item.get("verified_sources")
                if item.get("analysis_status"):
                    new_data["analysis_status"] = item.get("analysis_status")
                if item.get("stages"):
                    new_data["stages"] = item.get("stages")
                if item.get("house"):
                    new_data["house"] = item.get("house")
                if item.get("sponsor_title"):
                    new_data["sponsor_title"] = item.get("sponsor_title")

                if existing and v2_supported:
                    history = existing.get("history") or []
                    if not isinstance(history, list):
                        history = []
                    item_status = item.get('status') or existing.get('status') or "Published"
                    if existing.get('status') != item_status or existing.get('pdf_url') != item.get('pdf_url'):
                        history.append({
                            "status": existing.get('status'),
                            "pdf_url": existing.get('pdf_url'),
                            "date": existing.get('updated_at') or existing.get('created_at'),
                            "version_title": existing.get('title')
                        })
                    new_data["history"] = history

                    if existing.get('status_lock'):
                        logging.info(f"🔒 LOCKED: Preserving status for '{item['title']}'")
                        new_data.pop("status", None)

                # ── Serialize ai_concerns to JSON string if it's a list ──
                if isinstance(new_data.get("ai_concerns"), list):
                    import json as _json
                    new_data["ai_concerns"] = _json.dumps(new_data["ai_concerns"])

                # ── Serialize constitutional_section: flatten any nested array ──
                cs = new_data.get("constitutional_section")
                if isinstance(cs, list):
                    flat = []
                    for _cs_item in cs:
                        if isinstance(_cs_item, list):
                            flat.extend(_cs_item)
                        else:
                            flat.append(str(_cs_item))
                    new_data["constitutional_section"] = ", ".join(flat)

                if existing:
                    logging.info(f"🔄 Refreshing: {item['title']}")
                    TRACKED = ["status", "sponsor", "summary", "pdf_url", "url", "slug",
                               "ai_concerns", "constitutional_section", "tabloid_summary",
                               "text_content", "description", "bill_no", "session_year", "b2_url"]
                    has_change = any(
                        str(new_data.get(f) or "").strip() != str(existing.get(f) or "").strip()
                        for f in TRACKED if new_data.get(f) is not None
                    )
                    if has_change:
                        safe_data = _filter_payload(new_data, bills_cols)
                        supabase.table("bills").update(safe_data).eq("id", existing['id']).execute()
                        file_stats["updates"] += 1
                        stats["updates"] += 1
                    else:
                        logging.debug(f"⏭️  No changes for: {item['title']} — skipped UPDATE")

                else:
                    logging.info(f"✨ New Bill: {item['title']}")
                    if not new_data.get("status"):
                        new_data["status"] = "Published" if item.get("category") != "Documentation" else "Ingested"
                    safe_data = _filter_payload(new_data, bills_cols)
                    supabase.table("bills").upsert(safe_data, on_conflict="slug").execute()
                    file_stats["bills"] += 1
                    stats["bills"] += 1

            except Exception as e:
                logging.error(f"❌ Sync failure on '{item.get('title')}': {e}")
                file_stats["failed"] += 1
                stats["failed"] += 1

        logging.info(
            f"  [{os.path.basename(latest_file)}] New={file_stats['bills']}, "
            f"Updates={file_stats['updates']}, OrderPapers={file_stats['order_papers']}, "
            f"Failed={file_stats['failed']}"
        )
        record_scrape_run(supabase, file_stats, source_name)
        synced_now.append(latest_file)

    # ── Save synced tracker so we don't re-process these files ──
    if not input_file:
        try:
            all_synced = list(already_synced | set(synced_now))
            with open(synced_tracker_path, 'w') as tf:
                json.dump(all_synced, tf, indent=2)
        except Exception as te:
            logging.warning(f"⚠️ Could not save synced tracker: {te}")

    logging.info(
        f"🏁 Overall: New={stats['bills']}, Updates={stats['updates']}, "
        f"OrderPapers={stats['order_papers']}, Failed={stats['failed']}"
    )


def apply_tracker_enrichment(input_file: Optional[str] = None, output_dir: str = "processed_data/legislative"):
    """
    Reads the latest tracker_enrichment_*.json sidecar and applies
    UPDATE-only enrichment to matched bill records in Supabase.
    Never inserts new records. Only updates tracker-owned fields.
    Fields owned by primary scrape (title, summary, text_content, ai_concerns, b2_url) are never touched.
    """
    load_env()
    supabase = get_supabase_client()

    # Find the enrichment sidecar
    if input_file:
        enrich_file = input_file
    else:
        if not os.path.exists(output_dir):
            logging.warning("[Tracker Enrichment] No output_dir found. Skipping.")
            return
        candidates = [
            f for f in os.listdir(output_dir)
            if f.startswith("tracker_enrichment_") and f.endswith(".json")
        ]
        if not candidates:
            logging.info("[Tracker Enrichment] No tracker sidecar found. Nothing to enrich.")
            return
        candidates.sort()
        enrich_file = os.path.join(output_dir, candidates[-1])

    logging.info(f"[Tracker Enrichment] Loading sidecar: {enrich_file}")
    with open(enrich_file, "r", encoding="utf-8") as f:
        payload = json.load(f)

    matched_rows = payload.get("matched", [])
    unmatched_rows = payload.get("unmatched", [])
    logging.info(f"[Tracker Enrichment] {len(matched_rows)} matched, {len(unmatched_rows)} unmatched rows")

    # Status advancement order — only move forward
    STATUS_ORDER = [
        "PUBLISHED", "PRE-PUBLICATION", "1ST READING", "COMMITTEE",
        "2ND READING", "REPORT STAGE", "COMMITTEE STAGE", "3RD READING",
        "PASSED", "FORWARDED", "ASSENT"
    ]

    stats = {"enriched": 0, "skipped_locked": 0, "not_found": 0, "failed": 0}
    bills_cols = get_bills_columns(supabase)

    for enrichment in matched_rows:
        try:
            bill_title = enrichment.get("bill_title", "")
            bill_no    = enrichment.get("bill_no", "")

            # Find the bill in Supabase (bill_no first, then title)
            existing = None
            if bill_no:
                try:
                    res = supabase.table("bills").select("id,status,status_lock,sponsor") \
                        .eq("bill_no", bill_no).maybe_single().execute()
                    if res and res.data:
                        existing = res.data
                except Exception:
                    pass

            if not existing and bill_title:
                try:
                    res = supabase.table("bills").select("id,status,status_lock,sponsor") \
                        .eq("title", bill_title).maybe_single().execute()
                    if res and res.data:
                        existing = res.data
                except Exception:
                    pass

            if not existing:
                logging.warning(f"[Tracker Enrichment] Bill not found in DB: '{bill_title}' ({bill_no})")
                stats["not_found"] += 1
                continue

            # Respect status_lock
            if existing.get("status_lock"):
                logging.info(f"[Tracker Enrichment] 🔒 LOCKED — skipping status for: '{bill_title}'")
                stats["skipped_locked"] += 1

            # Build update payload — tracker-owned fields only
            update = {}

            # Dates — only set if non-empty and field is currently null
            for field, val in [
                ("first_reading_date",  enrichment.get("first_reading_date")),
                ("committee_date",       enrichment.get("committee_date")),
                ("second_reading_date", enrichment.get("second_reading_date")),
                ("third_reading_date",  enrichment.get("third_reading_date")),
                ("assent_date",         enrichment.get("assent_date")),
            ]:
                if val and val.strip():
                    update[field] = val.strip()

            # Sponsor — use tracker value only if no sponsor currently set
            tracker_sponsor = enrichment.get("tracker_sponsor")
            if tracker_sponsor and not existing.get("sponsor"):
                update["sponsor"] = tracker_sponsor

            # Status — only advance, never downgrade, never override a lock
            if not existing.get("status_lock"):
                tracker_status = (enrichment.get("tracker_status") or "").upper()
                current_status = (existing.get("status") or "").upper()
                try:
                    curr_idx  = STATUS_ORDER.index(current_status)
                    track_idx = STATUS_ORDER.index(tracker_status)
                    if track_idx > curr_idx:
                        update["status"] = STATUS_ORDER[track_idx]
                        logging.info(
                            f"[Tracker Enrichment] Status advanced: '{bill_title}' "
                            f"{current_status} → {STATUS_ORDER[track_idx]}"
                        )
                except ValueError:
                    pass  # Unknown stage — preserve existing

            # Enrichment metadata
            update["tracker_enriched_at"] = enrichment.get("enriched_at", datetime.now().isoformat())
            update["updated_at"] = datetime.now().isoformat()

            if len(update) > 2:  # More than just timestamps
                safe_update = _filter_payload(update, bills_cols)
                if len(safe_update) > 2:
                    supabase.table("bills").update(safe_update).eq("id", existing["id"]).execute()
                    logging.info(f"[Tracker Enrichment] ✅ Enriched: '{bill_title}' — fields: {list(safe_update.keys())}")
                    stats["enriched"] += 1
                else:
                    logging.debug(f"[Tracker Enrichment] All enrichment fields missing from schema for: '{bill_title}' — skipping")
            else:
                logging.debug(f"[Tracker Enrichment] No new fields for: '{bill_title}' — skipping UPDATE")

        except Exception as e:
            logging.error(f"[Tracker Enrichment] ❌ Failed on '{enrichment.get('bill_title')}': {e}")
            stats["failed"] += 1

    logging.info(
        f"[Tracker Enrichment] Complete — "
        f"Enriched: {stats['enriched']}, "
        f"Locked (skipped status): {stats['skipped_locked']}, "
        f"Not found: {stats['not_found']}, "
        f"Failed: {stats['failed']}"
    )

    # Log unmatched rows for manual review
    if unmatched_rows:
        unmatched_path = enrich_file.replace("tracker_enrichment_", "tracker_unmatched_")
        with open(unmatched_path, "w", encoding="utf-8") as f:
            json.dump(unmatched_rows, f, indent=2, ensure_ascii=False)
        logging.warning(
            f"[Tracker Enrichment] {len(unmatched_rows)} unmatched rows saved to: {unmatched_path}"
        )


def flush_staging_to_bills():
    """
    Copies all rows from `bills_staging` into the primary `bills` table
    using the same upsert/update logic as sync_data(), then purges `bills_staging`.
    Called with --flush-staging flag, typically on the half-day cadence job.
    """
    load_env()
    supabase = get_supabase_client()
    v2_supported = check_schema_support(supabase)

    logging.info("[FlushStaging] ── Starting bills_staging → bills flush ──")

    try:
        result = supabase.table("bills_staging").select("*").execute()
        items = result.data or []
    except Exception as e:
        logging.error(f"[FlushStaging] Failed to fetch bills_staging rows: {e}")
        return

    if not items:
        logging.info("[FlushStaging] bills_staging is empty — nothing to flush.")
        return

    logging.info(f"[FlushStaging] {len(items)} staged bill(s) to flush into bills table.")

    stats = {"bills": 0, "updates": 0, "order_papers": 0, "failed": 0}
    flushed_ids = []
    bills_cols  = get_bills_columns(supabase)

    for item in items:
        try:
            staging_id = item.get("id")
            category = item.get("category")

            if category == "Order Paper":
                if not v2_supported:
                    continue
                data = {
                    "title": item.get("title"),
                    "house": item.get("house"),
                    "pdf_url": item.get("url"),
                    "source": item.get("source"),
                    "metadata": item.get("metadata", {}),
                    "date": item.get("date")
                }
                supabase.table("order_papers").upsert(data, on_conflict="title").execute()
                stats["order_papers"] += 1
                if staging_id:
                    flushed_ids.append(staging_id)
                continue

            existing = find_existing_bill(supabase, item, v2_supported)

            new_data = {
                "title": item.get("title"),
                "slug": item.get("slug") or generate_slug(item.get("title", "")),
                "sponsor": item.get("sponsor"),
                "status": item.get("status"),
                "category": item.get("category"),
                "date": item.get("date"),
                "url": item.get("url"),
                "pdf_url": item.get("pdf_url"),
                "text_content": item.get("text_content"),
                "description": item.get("description"),
                "summary": item.get("summary") or f"Legislative tracker: {item.get('title')}",
                "updated_at": datetime.now().isoformat()
            }

            if v2_supported:
                if item.get("bill_no"):
                    new_data["bill_no"] = item.get("bill_no")
                if item.get("session_year"):
                    new_data["session_year"] = item.get("session_year")

            if item.get("b2_url"):
                new_data["b2_url"] = item.get("b2_url")
            if item.get("ai_concerns"):
                new_data["ai_concerns"] = item.get("ai_concerns")
            if item.get("constitutional_section"):
                new_data["constitutional_section"] = item.get("constitutional_section")
            if item.get("tabloid_summary"):
                new_data["tabloid_summary"] = item.get("tabloid_summary")
            if item.get("neural_summary"):
                new_data["neural_summary"] = item.get("neural_summary")
            if item.get("corroboration_score"):
                new_data["corroboration_score"] = item.get("corroboration_score")
            if item.get("verified_sources"):
                new_data["verified_sources"] = item.get("verified_sources")
            if item.get("analysis_status"):
                new_data["analysis_status"] = item.get("analysis_status")
            if item.get("stages"):
                new_data["stages"] = item.get("stages")
            if item.get("house"):
                new_data["house"] = item.get("house")
            if item.get("sponsor_title"):
                new_data["sponsor_title"] = item.get("sponsor_title")

            if existing and v2_supported:
                history = existing.get("history") or []
                if not isinstance(history, list):
                    history = []
                item_status = item.get('status') or existing.get('status') or "Published"
                if existing.get('status') != item_status or existing.get('pdf_url') != item.get('pdf_url'):
                    history.append({
                        "status": existing.get('status'),
                        "pdf_url": existing.get('pdf_url'),
                        "date": existing.get('updated_at') or existing.get('created_at'),
                        "version_title": existing.get('title')
                    })
                new_data["history"] = history
                if existing.get('status_lock'):
                    logging.info(f"🔒 LOCKED: Preserving status for '{item['title']}'")
                    new_data.pop("status", None)

            # ── Serialize ai_concerns to JSON string if it's a list ──
            if isinstance(new_data.get("ai_concerns"), list):
                import json as _json
                new_data["ai_concerns"] = _json.dumps(new_data["ai_concerns"])

            # ── Serialize constitutional_section: flatten any nested array ──
            cs = new_data.get("constitutional_section")
            if isinstance(cs, list):
                flat = []
                for cs_item in cs:
                    if isinstance(cs_item, list):
                        flat.extend(cs_item)
                    else:
                        flat.append(str(cs_item))
                new_data["constitutional_section"] = ", ".join(flat)

            if existing:
                logging.info(f"🔄 [FlushStaging] Refreshing: {item['title']}")
                TRACKED = ["status", "sponsor", "summary", "pdf_url", "url", "slug",
                           "ai_concerns", "constitutional_section", "tabloid_summary",
                           "text_content", "description", "bill_no", "session_year", "b2_url"]
                has_change = any(
                    str(new_data.get(f) or "").strip() != str(existing.get(f) or "").strip()
                    for f in TRACKED if new_data.get(f) is not None
                )
                if has_change:
                    safe_data = _filter_payload(new_data, bills_cols)
                    supabase.table("bills").update(safe_data).eq("id", existing['id']).execute()
                    stats["updates"] += 1
                else:
                    logging.debug(f"⏭️  No changes for: {item['title']} — skipped UPDATE")
            else:
                logging.info(f"✨ [FlushStaging] New Bill: {item['title']}")
                if not new_data.get("status"):
                    new_data["status"] = "Published" if item.get("category") != "Documentation" else "Ingested"
                safe_data = _filter_payload(new_data, bills_cols)
                supabase.table("bills").upsert(safe_data, on_conflict="slug").execute()
                stats["bills"] += 1

            if staging_id:
                flushed_ids.append(staging_id)

        except Exception as e:
            logging.error(f"[FlushStaging] ❌ Flush failure on '{item.get('title')}': {e}")
            stats["failed"] += 1

    logging.info(
        f"[FlushStaging] ── Flush complete: New={stats['bills']}, Updates={stats['updates']}, "
        f"OrderPapers={stats['order_papers']}, Failed={stats['failed']} ──"
    )

    # Purge successfully flushed rows from bills_staging
    if flushed_ids:
        try:
            logging.info(f"[FlushStaging] Purging {len(flushed_ids)} row(s) from bills_staging...")
            # Supabase delete in batches of 100 to avoid request size limits
            batch_size = 100
            for i in range(0, len(flushed_ids), batch_size):
                batch = flushed_ids[i:i + batch_size]
                supabase.table("bills_staging").delete().in_("id", batch).execute()
            logging.info(f"[FlushStaging] ✅ bills_staging purged — {len(flushed_ids)} row(s) removed.")
        except Exception as e:
            logging.error(f"[FlushStaging] Failed to purge bills_staging (manual cleanup may be needed): {e}")

    source_name = items[0].get("source", "Staging Flush") if items else "Staging Flush"
    record_scrape_run(supabase, stats, source_name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Specific bills JSON file to upload (full path)", default=None)
    parser.add_argument("--tracker-file", help="Specific tracker enrichment JSON file (full path)", default=None)
    parser.add_argument("--skip-bills", action="store_true", help="Skip bills sync, run tracker enrichment only")
    parser.add_argument("--skip-tracker", action="store_true", help="Skip tracker enrichment, run bills sync only")
    parser.add_argument("--flush-staging", action="store_true", help="Flush bills_staging table into live bills table and purge staging. Skips standard JSON sync.")
    args = parser.parse_args()

    if args.flush_staging:
        flush_staging_to_bills()
    else:
        if not args.skip_bills:
            sync_data(input_file=args.file)

        if not args.skip_tracker:
            apply_tracker_enrichment(input_file=args.tracker_file)
