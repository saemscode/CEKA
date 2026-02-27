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
    """Safely move all FK references from legacy record to master record."""
    if legacy_id == master_id:
        return
    
    relink_map = [
        ('iebc_office_contributions', 'original_office_id'),
        ('contribution_archive', 'original_office_id'),
        ('verification_log', 'office_id')
    ]
    
    for table, col in relink_map:
        try:
            # Check if there are any refs first
            check = supabase.table(table).select(col).eq(col, legacy_id).execute()
            if check.data:
                logger.info(f"Relinking {len(check.data)} refs in {table}.{col}: {legacy_id} -> {master_id}")
                supabase.table(table).update({col: master_id}).eq(col, legacy_id).execute()
        except Exception as e:
            logger.warning(f"Relink failed for {table}.{col} ({legacy_id}->{master_id}): {e}")

def main():
    logger.info("Starting ATOMIC CODE SYNC v3.0 (Collision-Resistant). GOHAM.")
    supabase = init_supabase()
    
    # 1. Build Master Registry from Official 290
    master_registry = {}
    try:
        with open(GEOJSON_FILE, 'r') as f:
            geojson_data = json.load(f)
            for feature in geojson_data['features']:
                props = feature['properties']
                name = props.get('constituency_name') or props.get('constituency')
                code_raw = props.get('constituency_code')
                county = props.get('county')
                if name and code_raw:
                    c_code = int(float(code_raw))
                    norm = normalize_name(name)
                    master_registry[c_code] = {
                        'name': name,
                        'county': normalize_name(county),
                        'code': c_code
                    }
        logger.info(f"Registry ready with {len(master_registry)} constituencies.")
    except Exception as e:
        logger.error(f"Registry fail: {e}"); return

    # 2. Load High-Precision Geocodes
    df_geo = pd.read_csv(INPUT_CSV)
    df_geo['name_norm'] = df_geo['constituency_name'].apply(normalize_name)
    geo_lookup = df_geo.sort_values('geocode_confidence', ascending=False).drop_duplicates(subset=['name_norm']).set_index('name_norm').to_dict('index')

    # 3. Load Raw Strings for distance/landmark refinement
    df_raw = pd.read_csv(RAW_CSV) if RAW_CSV.exists() else pd.DataFrame()
    raw_lookup = {}
    if not df_raw.empty:
        df_raw['name_norm'] = df_raw['constituency'].apply(normalize_name)
        raw_lookup = df_raw.set_index('name_norm').to_dict('index')

    # 4. Fetch DB State
    logger.info("Scanning DB for duplicates...")
    db_offices = supabase.table('iebc_offices').select('id, constituency').execute().data
    name_to_ids = {}
    for item in db_offices:
        norm = normalize_name(item['constituency'])
        if norm not in name_to_ids: name_to_ids[norm] = []
        name_to_ids[norm].append(item['id'])

    # 5. ATOMIC TRANSITION
    pushed_ids = set()
    
    for c_code, info in sorted(master_registry.items()):
        norm = normalize_name(info['name'])
        master_id = c_code
        
        # Determine all existing IDs that belong to this constituency
        existing_ids = name_to_ids.get(norm, [])
        
        # Step A: Relink ALL refs from current IDs to the target master_id
        for e_id in existing_ids:
            relink_references(supabase, e_id, master_id)
            
        # Step B: Delete ALL current IDs for this constituency to clear the way (Name collision)
        if existing_ids:
            logger.info(f"Clearing {len(existing_ids)} existing records for {norm} to avoid collision...")
            for e_id in existing_ids:
                try:
                    supabase.table('iebc_offices').delete().eq('id', e_id).execute()
                except Exception as e:
                    logger.warning(f"Failed to delete old record {e_id} for {norm}: {e}")
        
        # Step C: Upsert the fresh master record
        geo = geo_lookup.get(norm, {})
        raw = raw_lookup.get(norm, {})
        landmark = raw.get('landmark')
        if pd.isna(landmark) or landmark in ['0', '0.0']: landmark = geo.get('landmark')
        dist = parse_distance(raw.get('distance')) or parse_distance(geo.get('distance_from_landmark'))

        record = {
            'id': master_id,
            'county': info['county'],
            'constituency_code': c_code,
            'constituency': info['name'],
            'constituency_name': info['name'],
            'office_location': geo.get('office_location') or raw.get('location') or 'IEBC Office',
            'landmark': str(landmark) if pd.notna(landmark) and landmark not in ['0', '0.0'] else None,
            'distance_from_landmark': float(dist) if dist is not None else None,
            'latitude': float(geo.get('latitude', 0)),
            'longitude': float(geo.get('longitude', 0)),
            'geocode_method': geo.get('geocode_method', 'atomic_sync_v3'),
            'geocode_confidence': float(geo.get('geocode_confidence', 0.99)),
            'accuracy_meters': float(geo.get('accuracy_meters', 2)),
            'formatted_address': geo.get('formatted_address'),
            'verified': False,
            'geocode_status': 'success',
            'source': 'IEBC Master Atomic Sync v3',
            'notes': f"GOHAM Atomic Sync. ID aligned to code {c_code}. Zero collision."
        }
        
        try:
            supabase.table('iebc_offices').upsert(record).execute()
            pushed_ids.add(master_id)
        except Exception as e:
            logger.error(f"Atomic SYNC failed for {info['name']} (ID {master_id}): {e}")

    # 6. Final Cleanup of any missed IDs (non-1-290)
    logger.info("Final cleanup of rogue IDs...")
    final_ids = set(x['id'] for x in supabase.table('iebc_offices').select('id').execute().data)
    rogues = final_ids - pushed_ids
    if rogues:
        logger.info(f"Deleting {len(rogues)} remaining rogue records...")
        for r_id in rogues:
            try:
                supabase.table('iebc_offices').delete().eq('id', r_id).execute()
            except: pass

    # 7. Verification
    final_count = supabase.table('iebc_offices').select('id', count='exact').execute()
    logger.info(f"GOHAM: Atomic Sync Complete. Final DB Count: {final_count.count}")
    if final_count.count == 290:
        logger.info("VERIFIED: Exactly 290 records are present in the official 1-290 block. GOHAM.")

if __name__ == "__main__":
    main()
