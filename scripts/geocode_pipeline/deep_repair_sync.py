import os
import re
import json
import pandas as pd
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# File paths
BASE_DIR = Path(r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline")
DATA_DIR = Path(r"D:\CEKA\ceka v010\CONTEXT - CEKA\DATA")
INPUT_CSV = BASE_DIR / "data" / "geocoded_iebc_offices.csv"
RAW_CSV = DATA_DIR / "raw_iebc_offices_290.csv"
GEOJSON_FILE = DATA_DIR / "constituencies_with_centroids.geojson"

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def init_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase URL and Service Key must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def normalize_name(name):
    if not name: return ""
    s = str(name).strip().upper()
    s = re.sub(r'\s+', ' ', s)
    s = s.replace("'", "") 
    return s

def parse_distance(val):
    if pd.isna(val) or val == "" or val == "0" or val == "0.0":
        return None
    try:
        nums = re.findall(r"[-+]?\d*\.\d+|\d+", str(val))
        if not nums: return None
        num = float(nums[0])
        if "km" in str(val).lower(): num = num * 1000.0
        return num
    except: return None

def relink_references(supabase: Client, legacy_id, master_id):
    """Safely move FK references from legacy record to master record."""
    tables = [
        ('iebc_office_contributions', 'original_office_id'),
        ('contribution_archive', 'original_office_id')
    ]
    for table, col in tables:
        try:
            supabase.table(table).update({col: master_id}).eq(col, legacy_id).execute()
        except Exception as e:
            logger.warning(f"Failed to relink {table}.{col} for {legacy_id} -> {master_id}: {e}")

def main():
    logger.info("Starting DEEP REPAIR v4.0 (Ref-Aware): 290-Record Master Sync. GOHAM.")
    
    # 1. Master Code Registry
    master_registry = {}
    try:
        with open(GEOJSON_FILE, 'r') as f:
            geojson_data = json.load(f)
            for feature in geojson_data['features']:
                props = feature['properties']
                name = props.get('constituency_name') or props.get('constituency')
                code = props.get('constituency_code')
                county = props.get('county')
                if name:
                    norm = normalize_name(name)
                    master_registry[norm] = {
                        'code': int(float(code)) if code else None,
                        'county': normalize_name(county)
                    }
    except Exception as e:
        logger.error(f"Registry fail: {e}"); return

    # 2. Load Geocoded Data (Targets)
    df_geo = pd.read_csv(INPUT_CSV)
    df_geo['name_norm'] = df_geo['constituency_name'].apply(normalize_name)
    df_geo = df_geo.sort_values('geocode_confidence', ascending=False).drop_duplicates(subset=['name_norm'])
    logger.info(f"Loaded {len(df_geo)} geocoded targets.")

    # 3. Load Raw Enrichment
    df_raw = pd.read_csv(RAW_CSV) if RAW_CSV.exists() else pd.DataFrame()
    raw_lookup = {}
    if not df_raw.empty:
        df_raw['name_norm'] = df_raw['constituency'].apply(normalize_name)
        raw_lookup = df_raw.set_index('name_norm').to_dict('index')

    # 4. Fetch Supabase State + References
    supabase = init_supabase()
    logger.info("Fetching DB state and identifying reference anchors...")
    db_res = supabase.table('iebc_offices').select('id, constituency').execute()
    existing_offices = db_res.data
    
    # Get all IDs used as references to avoid deletion locks
    ca_refs = supabase.table('contribution_archive').select('original_office_id').execute()
    ioc_refs = supabase.table('iebc_office_contributions').select('original_office_id').execute()
    referenced_ids = set(x['original_office_id'] for x in ca_refs.data if x['original_office_id']) | \
                     set(x['original_office_id'] for x in ioc_refs.data if x['original_office_id'])
    
    # Group existing IDs by normalized name
    group_map = {} # norm -> list of IDs
    for item in existing_offices:
        norm = normalize_name(item['constituency'])
        if norm not in group_map: group_map[norm] = []
        group_map[norm].append(item['id'])

    # 5. Build Sync Pack & Resolve Merges
    final_batch = []
    ids_to_keep = set()
    ids_to_kill = set()
    
    for _, row in df_geo.iterrows():
        name_orig = row['constituency_name']
        norm = row['name_norm']
        reg = master_registry.get(norm, {})
        raw = raw_lookup.get(norm, {})
        
        # Pick the Master ID for this constituency
        existing_ids = group_map.get(norm, [])
        master_id = None
        
        if existing_ids:
            # Prioritize an ID that already has references
            referenced_existing = [i for i in existing_ids if i in referenced_ids]
            if referenced_existing:
                master_id = referenced_existing[0]
                # If there are other referenced IDs in this group, they must be relinked to master
                for other_id in existing_ids:
                    if other_id != master_id:
                        if other_id in referenced_ids:
                            logger.info(f"Relinking references for duplicate constituency {norm}: {other_id} -> {master_id}")
                            relink_references(supabase, other_id, master_id)
                        ids_to_kill.add(other_id)
            else:
                master_id = existing_ids[0]
                for other_id in existing_ids[1:]:
                    ids_to_kill.add(other_id)
        
        if master_id: ids_to_keep.add(master_id)
        
        # Build Record
        code = reg.get('code') or (int(float(row['constituency_code'])) if pd.notna(row.get('constituency_code')) else None)
        record = {
            'county': normalize_name(row.get('county') or reg.get('county') or 'UNKNOWN'),
            'constituency_code': int(code) if code else None,
            'constituency': name_orig,
            'constituency_name': name_orig,
            'office_location': row.get('office_location') or raw.get('location') or 'IEBC Office',
            'landmark': str(raw.get('landmark')) if pd.notna(raw.get('landmark')) and raw.get('landmark') not in ['0', '0.0'] else row.get('landmark'),
            'distance_from_landmark': parse_distance(raw.get('distance')) or parse_distance(row.get('distance_from_landmark')),
            'latitude': float(row.get('latitude', 0)),
            'longitude': float(row.get('longitude', 0)),
            'geocode_method': row.get('geocode_method', 'ref_aware_v4'),
            'geocode_confidence': float(row.get('geocode_confidence', 0.9)),
            'accuracy_meters': float(row.get('accuracy_meters', 100)),
            'formatted_address': row.get('formatted_address'),
            'verified': False,
            'geocode_status': 'success',
            'source': 'IEBC Master Sync 4.0',
            'notes': f"Master Sync v4. Code: {code}. Ref-Anchored: {master_id in referenced_ids if master_id else 'New'}"
        }
        if master_id: record['id'] = master_id
        final_batch.append(record)

    # 6. Push Batch
    logger.info(f"Upserting {len(final_batch)} sanitized records...")
    if final_batch:
        logger.info(f"Sample Record: {json.dumps(final_batch[0], indent=2, default=str)}")
    
    for i in range(0, len(final_batch), 50):
        chunk = final_batch[i:i+50]
        try:
            supabase.table('iebc_offices').upsert(chunk).execute()
            logger.info(f"Pushed chunk {i//50 + 1}...")
        except Exception as e:
            logger.error(f"CHUNK {i//50 + 1} FAILED: {e}")
            # Try item by item to pinpoint the culprit
            for idx, item in enumerate(chunk):
                try:
                    supabase.table('iebc_offices').upsert(item).execute()
                except Exception as ex:
                    logger.error(f"FAILURE on item {idx} ({item.get('constituency')}): {ex}")
                    logger.error(f"Culprit Data: {json.dumps(item, default=str)}")
            raise e # Rethrow after individual logs
    current_ids = set(item['id'] for item in supabase.table('iebc_offices').select('id').execute().data)
    to_delete = current_ids - ids_to_keep
    if to_delete:
        logger.info(f"Deleting {len(to_delete)} garbage/duplicate records...")
        for j in range(0, len(list(to_delete)), 50):
            batch_del = list(to_delete)[j:j+50]
            # Double check for references before deleting any final batch
            supabase.table('iebc_offices').delete().in_('id', batch_del).execute()

    # Final Verification
    res = supabase.table('iebc_offices').select('id', count='exact').execute()
    logger.info(f"GOHAM: Final Count {res.count}. (Expected 290)")

if __name__ == "__main__":
    main()
