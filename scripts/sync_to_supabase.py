import os
import json
import logging
import re
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
    """Normalize title for similarity comparison (Version Detection)."""
    t = title.lower()
    t = re.sub(r'\b(the|bill|no|of|copy|amendment|senate|national|assembly|gazette)\b', '', t)
    t = re.sub(r'\b20\d{2}\b', '', t)
    t = re.sub(r'[^\w\s]', '', t)
    return " ".join(t.split()).strip()


def find_existing_bill(supabase: Client, item: Dict, v2_supported: bool) -> Optional[Dict[str, Any]]:
    """Lookup existing bill using Bill No or Similarity Logic."""
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
    """Check if bills table has bill_no column (v2)."""
    try:
        supabase.table("bills").select("bill_no").limit(1).execute()
        return True
    except Exception:
        return False


def sync_data(output_dir="processed_data/legislative"):
    load_env()
    supabase = get_supabase_client()

    if not os.path.exists(output_dir):
        logging.error(f"❌ Hub directory missing: {output_dir}")
        return

    files = [f for f in os.listdir(output_dir) if f.startswith('legislation_sync_') and f.endswith('.json')]
    if not files:
        logging.warning("⚠️ No fresh neural data hub files found.")
        return

    files.sort()
    latest_file = os.path.join(output_dir, files[-1])
    logging.info(f"🚀 Ingesting Brain Dump: {latest_file}")

    with open(latest_file, 'r', encoding='utf-8') as f:
        items = json.load(f)

    stats = {"bills": 0, "updates": 0, "order_papers": 0, "failed": 0}
    source_name = items[0].get("source", "Parliamentary Portal") if items else "Parliamentary Portal"

    v2_supported = check_schema_support(supabase)

    for item in items:
        try:
            category = item.get("category")

            # --- Order Papers (separate table) ---
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
                continue

            # --- Bills ---
            existing = find_existing_bill(supabase, item, v2_supported)

            # Build update data – only columns that exist in schema (see bills table)
            new_data = {
                "title": item.get("title"),
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

            # Optional v2 fields
            if v2_supported:
                if item.get("bill_no"):
                    new_data["bill_no"] = item.get("bill_no")
                if item.get("session_year"):
                    new_data["session_year"] = item.get("session_year")

            # JSONB fields
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

            # Sponsor title (exists in schema)
            if item.get("sponsor_title"):
                new_data["sponsor_title"] = item.get("sponsor_title")

            # History and status lock handling
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

            if existing:
                logging.info(f"🔄 Refreshing: {item['title']}")
                supabase.table("bills").update(new_data).eq("id", existing['id']).execute()
                stats["updates"] += 1
            else:
                logging.info(f"✨ New Bill: {item['title']}")
                if not new_data.get("status"):
                    new_data["status"] = "Published" if item.get("category") != "Documentation" else "Ingested"
                # Insert using upsert on title (unique constraint)
                supabase.table("bills").upsert(new_data, on_conflict="title").execute()
                stats["bills"] += 1

        except Exception as e:
            logging.error(f"❌ Sync failure on '{item.get('title')}': {e}")
            stats["failed"] += 1

    logging.info(f"🏁 Complete: New={stats['bills']}, Updates={stats['updates']}, OrderPapers={stats['order_papers']}, Failed={stats['failed']}")
    record_scrape_run(supabase, stats, source_name)


if __name__ == "__main__":
    sync_data()