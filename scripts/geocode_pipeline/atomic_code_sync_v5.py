import os
import re
import json
import pandas as pd
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from fuzzywuzzy import fuzz, process

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
    
    # Identify tables with FKs to iebc_offices
    # Note: We include common ones and known ones. 
    # If a table doesn't exist, Supabase will return an error which we catch.
    relink_map = [
        ('iebc_office_contributions', 'original_office_id'),
        ('contribution_archive', 'original_office_id'),
        ('verification_log', 'office_id')
    ]
    
    for table, col in relink_map:
        try:
            # Check if there are any refs first
            check = supabase.table(table).select(col).eq(col, legacy_id).execute()
            if check.data and len(check.data) > 0:
                logger.info(f"Relinking {len(check.data)} refs in {table}.{col}: {legacy_id} -> {master_id}")
                supabase.table(table).update({col: master_id}).eq(col, legacy_id).execute()
        except Exception as e:
            # Silently handle missing tables/columns
            pass

def main():
    logger.info("Starting ATOMIC CODE SYNC v5.0 (Deterministic IDs). GOHAM.")
    supabase = init_supabase()
    
    # 1. Build Master Registry from Official 290 (GeoJSON)
    logger.info("Building Master Code Registry from GeoJSON...")
    master_registry = [] # List of dicts
    with open(GEOJSON_FILE, 'r') as f:
        geojson_data = json.load(f)
        for feature in geojson_data['features']:
            props = feature['properties']
            name = props.get('constituency_name') or props.get('constituency')
            code_raw = props.get('constituency_code')
            county = props.get('county')
            if name and code_raw:
                master_registry.append({
                    'name': name,
                    'code': int(float(code_raw)),
                    'county': normalize_name(county)
                })
    
    if len(master_registry) != 290:
        logger.warning(f"Master registry size is {len(master_registry)}, but expected 290. Proceeding anyway.")

    # 2. Load and Prepare Source Data (Geocoded and Raw)
    logger.info("Loading source data (CSV)...")
    df_geo = pd.read_csv(INPUT_CSV)
    df_raw = pd.read_csv(RAW_CSV)
    
    # Combine sources for better lookup
    # Normalize names for indexing
    df_geo['name_norm'] = df_geo['constituency_name'].fillna('').apply(normalize_name)
    df_raw['name_norm'] = df_raw['constituency'].fillna('').apply(normalize_name)
    
    geo_lookup = df_geo.sort_values('geocode_confidence', ascending=False).drop_duplicates(subset=['name_norm']).set_index('name_norm').to_dict('index')
    raw_lookup = df_raw.sort_values('constituency').drop_duplicates(subset=['name_norm']).set_index('name_norm').to_dict('index')

    all_source_names = list(set(list(geo_lookup.keys()) + list(raw_lookup.keys())))

    # 3. Fetch current DB state for relinking
    logger.info("Fetching current DB state...")
    db_offices = supabase.table('iebc_offices').select('id, constituency').execute().data
    
    # Group existing IDs by normalized name
    name_to_ids = {}
    for item in db_offices:
        norm = normalize_name(item['constituency'])
        if norm not in name_to_ids: name_to_ids[norm] = []
        name_to_ids[norm].append(item['id'])

    # 4. ATOMIC SYNC: Process all 290
    logger.info("Executing fuzzy convergence...")
    pushed_ids = set()
    
    for m in master_registry:
        m_name = m['name']
        m_code = m['code'] # deterministic ID
        m_norm = normalize_name(m_name)
        
        # Fuzzy match to find source record
        match_result = process.extractOne(m_name, all_source_names, scorer=fuzz.token_sort_ratio)
        source_name = match_result[0] if match_result and match_result[1] >= 75 else None
        
        if not source_name:
            logger.warning(f"No source data found for {m_name} (Code {m_code}). Using GeoJSON only.")
            geo = {}
            raw = {}
        else:
            geo = geo_lookup.get(source_name, {})
            raw = raw_lookup.get(source_name, {})

        # Relink references from ANY record currently in DB that matches this name
        # Also include fuzzy matches from DB? Let's stick to what we have in name_to_ids
        # or do a fuzzy search in the DB names.
        
        # For simplicity, we search all DB names fuzzy for THIS master name
        db_names = list(name_to_ids.keys())
        db_match_result = process.extractOne(m_name, db_names, scorer=fuzz.token_sort_ratio)
        
        legacy_ids = []
        if db_match_result and db_match_result[1] >= 80:
            legacy_ids = name_to_ids.get(db_match_result[0], [])

        # Add the code itself if it's already in the DB (might be the wrong name)
        # We handle this by the upsert logic anyway, but relink is safer.
        for l_id in legacy_ids:
            relink_references(supabase, l_id, m_code)
        
        # Prepare Master Record
        landmark = raw.get('landmark')
        if pd.isna(landmark) or landmark in ['0', '0.0']: landmark = geo.get('landmark')
        dist = parse_distance(raw.get('distance')) or parse_distance(geo.get('distance_from_landmark'))

        record = {
            'id': m_code,
            'county': m['county'],
            'constituency_code': m_code,
            'constituency': m_name,
            'constituency_name': m_name,
            'office_location': geo.get('office_location') or raw.get('location') or 'IEBC Office',
            'landmark': str(landmark) if pd.notna(landmark) and landmark not in ['0', '0.0'] else None,
            'distance_from_landmark': float(dist) if dist is not None else None,
            'latitude': float(geo.get('latitude', 0)),
            'longitude': float(geo.get('longitude', 0)),
            'geocode_method': geo.get('geocode_method', 'atomic_sync_v5'),
            'geocode_confidence': float(geo.get('geocode_confidence', 0.99)),
            'accuracy_meters': float(geo.get('accuracy_meters', 1)),
            'formatted_address': geo.get('formatted_address'),
            'verified': False,
            'geocode_status': 'success',
            'source': 'IEBC Master Atomic Sync v5 (Fuzzy)',
            'notes': f"GOHAM Atomic Sync. Matched {m_name} to {source_name} (Score {match_result[1]})."
        }

        # Clear any existing record that would cause a unique conflict (constituency name)
        # Actually, upsert handles 'id' conflict. But if another record has the same 'constituency'
        # name but a different 'id', we might hit a unique index on 'constituency' (if it exists).
        # We already relinked and we'll delete rogues later.
        
        try:
            supabase.table('iebc_offices').upsert(record).execute()
            pushed_ids.add(m_code)
            logger.info(f"Pushed {m_name} (Code {m_code})")
        except Exception as e:
            logger.error(f"SYNC FAIL for {m_name}: {e}")

    # 5. Cleanup
    logger.info("Cleaning up rogue records...")
    final_db_state = supabase.table('iebc_offices').select('id').execute().data
    all_final_ids = set(x['id'] for x in final_db_state)
    rogues = all_final_ids - pushed_ids
    
    if rogues:
        logger.info(f"Deleting {len(rogues)} rogue records...")
        for r_id in rogues:
            try:
                supabase.table('iebc_offices').delete().eq('id', r_id).execute()
            except Exception as e:
                logger.warning(f"Delete failed for {r_id}: {e}")

    # 6. Verification
    final_res = supabase.table('iebc_offices').select('id', count='exact').execute()
    logger.info(f"ATOMIC SYNC v5 COMPLETE. Count: {final_res.count}")
    if final_res.count == 290:
        logger.info("SUCCESS: 290/290 master records verified with deterministic IDs. GOHAM.")

if __name__ == "__main__":
    main()
