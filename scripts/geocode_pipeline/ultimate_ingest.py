import os
import json
import pandas as pd
import re
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
INPUT_CSV = BASE_DIR / "data" / "geocoded_iebc_offices.csv"

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def init_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase URL and Service Key must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def main():
    logger.info("Starting database ingestion from CSV (Precision Schema v2)...")
    
    if not INPUT_CSV.exists():
        logger.error(f"CSV file not found: {INPUT_CSV}")
        return
    
    try:
        df = pd.read_csv(INPUT_CSV)
        logger.info(f"Loaded {len(df)} records from CSV")
        
        # Deduplicate to ensure exactly 290 constituencies
        df = df.sort_values('geocode_confidence', ascending=False).drop_duplicates(subset=['constituency_name'])
        logger.info(f"Deduplicated to {len(df)} unique constituencies")
        
        # Filter for valid geocodes
        df = df[df['geocode_status'].isin(['success', 'manual_review', 'verified', 'enhanced'])]
        logger.info(f"Filtering to {len(df)} valid geocodes")
        
        if df.empty:
            logger.warning("No valid records to ingest")
            return

        def clean_val(val, target_type=str, default=None):
            if pd.isna(val) or val == "":
                return default
            try:
                if target_type == int:
                    return int(float(str(val).replace(',', '')))
                if target_type == float:
                    if isinstance(val, str):
                        nums = re.findall(r"[-+]?\d*\.\d+|\d+", val)
                        if nums:
                            return float(nums[0])
                        return default
                    return float(val)
                return str(val)
            except (ValueError, TypeError):
                return default

        records = []
        for _, row in df.iterrows():
            lat = clean_val(row.get('latitude'), float)
            lon = clean_val(row.get('longitude'), float)
            code = clean_val(row.get('constituency_code'), int)
            distance = clean_val(row.get('distance_from_landmark'), float)
            
            # Map to EXACT table schema
            record = {
                'county': clean_val(row.get('county'), str, 'Unknown'),
                'constituency_code': code,
                'constituency': clean_val(row.get('constituency_name'), str, 'Unknown'),
                'constituency_name': clean_val(row.get('constituency_name'), str),
                'office_location': clean_val(row.get('office_location'), str, 'Unknown'),
                'landmark': clean_val(row.get('landmark'), str),
                'distance_from_landmark': distance,
                'latitude': lat,
                'longitude': lon,
                'geocode_method': clean_val(row.get('geocode_method'), str, 'nasaka_pipeline'),
                'geocode_confidence': clean_val(row.get('geocode_confidence'), float, 0.0),
                'accuracy_meters': clean_val(row.get('accuracy_meters'), float, 1000.0),
                'formatted_address': clean_val(row.get('formatted_address'), str),
                'geocode_status': clean_val(row.get('geocode_status'), str, 'success'),
                'source': 'Kenya Gazette IEBC Locations Extraction',
                'verified': False,
                'notes': f"Automated ingestion {pd.Timestamp.now().isoformat()}. Geocode: {row.get('geocode_method')}. Landmark ref: {row.get('landmark')} {row.get('distance_from_landmark')}"
            }
            records.append(record)
        
        supabase = init_supabase()
        
        # SMART UPSERT LOGIC: Match existing records by constituency to get their IDs
        logger.info("Fetching existing records from Supabase to match for upsert...")
        try:
            existing_res = supabase.table('iebc_offices').select('id, constituency, office_location').execute()
            existing_data = existing_res.data
            # Map constituency name (normalized) to ID
            constituency_to_id = {str(item['constituency']).strip().upper(): item['id'] for item in existing_data if item.get('constituency')}
            logger.info(f"Found {len(existing_data)} existing records in DB.")
        except Exception as e:
            logger.warning(f"Failed to fetch existing records: {e}. Falling back to clean insert.")
            constituency_to_id = {}

        records = []
        for _, row in df.iterrows():
            lat = clean_val(row.get('latitude'), float)
            lon = clean_val(row.get('longitude'), float)
            code = clean_val(row.get('constituency_code'), int)
            distance = clean_val(row.get('distance_from_landmark'), float)
            
            const_name_raw = clean_val(row.get('constituency_name'), str)
            const_name_norm = const_name_raw.strip().upper() if const_name_raw else ""
            
            # Map to EXACT table schema
            record = {
                'county': clean_val(row.get('county'), str, 'Unknown'),
                'constituency_code': code,
                'constituency': const_name_raw, # character varying
                'constituency_name': const_name_raw,
                'office_location': clean_val(row.get('office_location'), str, 'Unknown'),
                'landmark': clean_val(row.get('landmark'), str),
                'distance_from_landmark': distance,
                'latitude': lat,
                'longitude': lon,
                'geocode_method': clean_val(row.get('geocode_method'), str, 'nasaka_pipeline'),
                'geocode_confidence': clean_val(row.get('geocode_confidence'), float, 0.0),
                'accuracy_meters': clean_val(row.get('accuracy_meters'), float, 1000.0),
                'formatted_address': clean_val(row.get('formatted_address'), str),
                'geocode_status': clean_val(row.get('geocode_status'), str, 'success'),
                'source': 'Kenya Gazette IEBC Locations Extraction',
                'verified': False,
                'notes': f"GOHAM SMART UPSERT {pd.Timestamp.now().isoformat()}. Method: {row.get('geocode_method')}"
            }
            
            # If we found a match by name, add the ID so it updates instead of inserts
            if const_name_norm in constituency_to_id:
                record['id'] = constituency_to_id[const_name_norm]
            
            records.append(record)

        # Ingest in batches
        batch_size = 50
        total_upserted = 0
        logger.info(f"Prepared {len(records)} records for Upsert (Update-or-Insert).")
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                # Upsert on 'id' if present, or insert if not. Supabase upsert handles this automatically if IDs are provided.
                response = supabase.table('iebc_offices').upsert(batch).execute()
                total_upserted += len(response.data) if hasattr(response, 'data') else 0
                logger.info(f"Upserted {total_upserted} records...")
            except Exception as e:
                logger.error(f"Batch upsert failed: {e}. Retrying individually...")
                for r in batch:
                    try:
                        supabase.table('iebc_offices').upsert(r).execute()
                        total_upserted += 1
                    except Exception as e2:
                        logger.error(f"Individual record failed: {r.get('constituency')} - {e2}")
            
        logger.info(f"GOHAM: Ingestion complete. Target: 290 total. In DB: {total_upserted}")
        
    except Exception as e:
        logger.error(f"Application failure: {e}")

if __name__ == "__main__":
    main()
