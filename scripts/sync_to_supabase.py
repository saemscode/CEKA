import os
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

# GO-HAM: FULL PIPELINE INTEGRATION & VERSIONING ENGINE
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
    # Remove common words that vary between versions
    t = re.sub(r'\b(the|bill|no|of|copy|amendment|senate|national|assembly|gazette)\b', '', t)
    t = re.sub(r'\b20\d{2}\b', '', t) # Remove years
    t = re.sub(r'[^\w\s]', '', t) # Remove punctuation
    return " ".join(t.split()).strip()

def find_existing_bill(supabase: Client, item: Dict, v2_supported: bool) -> Optional[Dict[str, Any]]:
    """Lookup existing bill using Bill No or Similarity Logic."""
    bill_no = item.get("bill_no")
    title = item.get("title", "")
    normalized = normalize_title(title)

    # 1. Exact match by Bill No (Highest confidence, only if v2 schema exists)
    if v2_supported and bill_no:
        try:
            res = supabase.table("bills").select("*").eq("bill_no", bill_no).maybe_single().execute()
            if res and hasattr(res, 'data') and res.data: return res.data
        except Exception as e:
            logging.warning(f"⚠️ Bill No lookup failed for '{bill_no}': {e}")
            # Fallback to title

    # 2. Exact match by Title
    try:
        res = supabase.table("bills").select("*").eq("title", title).maybe_single().execute()
        if res and hasattr(res, 'data') and res.data: return res.data
    except Exception:
        pass

    # 3. Similarity check
    first_word = title.split()[0] if title.split() else ""
    if len(first_word) > 3:
        candidates = supabase.table("bills").select("*").ilike("title", f"{first_word}%").execute()
        for cand in (candidates.data or []):
            if normalize_title(cand['title']) == normalized:
                # 🚨 MANDATORY YEAR PARITY: Do not match if years differ (e.g. 2024 vs 2026)
                cand_year_match = re.search(r'\b(20\d{2})\b', cand['title'])
                item_year_match = re.search(r'\b(20\d{2})\b', title)
                if cand_year_match and item_year_match:
                    if cand_year_match.group(1) != item_year_match.group(1):
                        continue
                return cand
    
    return None

def load_env():
    """Manually load .env file if it exists."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def record_scrape_run(supabase: Client, stats: Dict[str, int], source: str):
    """Log result to scrape_runs for dashboard visibility."""
    try:
        data = {
            "source": source,
            # "status": "Success" if stats['failed'] == 0 else "Partial", # REMOVED: column missing in DB
            "bills_found": stats['bills'] + stats['updates'] + stats['order_papers'],
            "bills_inserted": stats['bills'],
            "bills_updated": stats['updates'],
            "completed_at": datetime.now().isoformat(),
            "started_at": datetime.now().isoformat() # Placeholder for start
        }
        supabase.table("scrape_runs").insert(data).execute()
        logging.info("📊 Run logged to scrape_runs table.")
    except Exception as e:
        logging.error(f"⚠️ Failed to log run: {e}")

def check_schema_support(supabase: Client):
    """Check if bills table has the new columns for versioning."""
    try:
        supabase.table("bills").select("bill_no").limit(1).execute()
        return True
    except Exception:
        return False

def sync_data(output_dir="processed_data/legislative"):
    load_env() # Ensure credentials are loaded
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
    
    # Check for V2 schema support (bill_no, session_year, history)
    v2_supported = check_schema_support(supabase)
    if not v2_supported:
        logging.warning("⚠️ Database schema is v1. Advanced versioning (bill_no, history) will be bypassed.")

    for item in items:
        try:
            category = item.get("category")
            
            # --- ROUTE: ORDER PAPERS ---
            if category == "Order Paper":
                if not v2_supported: continue # Order papers table required
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

            # --- ROUTE: BILLS ---
            existing = find_existing_bill(supabase, item, v2_supported)
            
            new_data = {
                "title": item.get("title"),
                "sponsor": item.get("sponsor"),
                "sponsor_title": item.get("sponsor_title"),
                "status": item.get("status"),
                "category": item.get("category"),
                "date": item.get("date"),
                "url": item.get("url"),
                "pdf_url": item.get("pdf_url"),
                "text_content": item.get("text_content"),
                "description": item.get("description"),
                "summary": item.get("summary") or f"Legislative tracker: {item.get('title')}",
                "constitutional_section": item.get("constitutional_section") or item.get("metadata", {}).get("constitutional_section"),
                "neural_summary": item.get("neural_summary") or item.get("metadata", {}).get("neural_summary"),
                "tabloid_summary": item.get("tabloid_summary") or item.get("metadata", {}).get("tabloid_summary"),
                "ai_concerns": item.get("ai_concerns") or item.get("metadata", {}).get("ai_concerns") or [],
                "corroboration_score": item.get("corroboration_score") or item.get("metadata", {}).get("corroboration_score") or 0,
                "verified_sources": item.get("verified_sources") or item.get("metadata", {}).get("verified_sources") or [],
                "analysis_status": item.get("analysis_status") or item.get("metadata", {}).get("status") or "completed",
                "is_money_bill": item.get("is_money_bill"),
                "concerns_counties": item.get("concerns_counties"),
                "stages": item.get("stages") or item.get("metadata", {}).get("bill_type"),
                "updated_at": datetime.now().isoformat()
            }
            
            if v2_supported:
                new_data["bill_no"] = item.get("bill_no")
                new_data["session_year"] = item.get("session_year")

            if existing:
                # Always ensure status is set
                item_status = item.get('status') or existing.get('status') or "Published"
                
                # STATUS_LOCK GUARD: If the existing bill has a manual status lock,
                # preserve the DB status and stages — do NOT overwrite with scraped data
                if existing.get('status_lock'):
                    logging.info(f"🔒 LOCKED: Preserving status for '{item['title']}' — status_lock is active.")
                    item_status = existing['status']  # Keep the DB status
                    new_data.pop("status", None)      # Remove status from update payload
                    new_data.pop("stages", None)       # Remove stages from update payload

                # FORCE UPDATE: We now update the bill regardless of status change 
                # to ensure new structural metadata (like Article 114) is captured.
                logging.info(f"🔄 Refreshing Intelligence: {item['title']} ({item_status})")
                
                if v2_supported:
                    history = existing.get("history") or []
                    if not isinstance(history, list): history = []
                    # Only add to history if the status or URL actually changed
                    if existing['status'] != item_status or existing['pdf_url'] != item.get('pdf_url'):
                        history.append({
                            "status": existing['status'],
                            "pdf_url": existing['pdf_url'],
                            "date": existing['updated_at'] or existing['created_at'],
                            "version_title": existing['title']
                        })
                    new_data["history"] = history
                    if not existing.get('status_lock'):
                        new_data["status"] = item_status # Update status in payload only if NOT locked
                
                supabase.table("bills").update(new_data).eq("id", existing['id']).execute()
                stats["updates"] += 1
            else:
                logging.info(f"✨ New Bill Discovered: {item['title']}")
                # Ensure status for new bills
                if not new_data.get("status"):
                    new_data["status"] = "Published" if item.get("category") != "Documentation" else "Ingested"
                
                # Use upsert to handle race conditions/duplicates gracefully
                supabase.table("bills").upsert(new_data, on_conflict="title").execute()
                stats["bills"] += 1

        except Exception as e:
            logging.error(f"❌ Sync failure on '{item.get('title')}': {e}")
            stats["failed"] += 1

    logging.info(f"🏁 Processing Complete:")
    logging.info(f"   - New Bills: {stats['bills']}")
    logging.info(f"   - Advancements: {stats['updates']}")
    if v2_supported:
        logging.info(f"   - Order Papers: {stats['order_papers']}")
    logging.info(f"   - Failures: {stats['failed']}")

    record_scrape_run(supabase, stats, source_name)

if __name__ == "__main__":
    sync_data()

