import os
import re
import json
import logging
import pandas as pd
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

def init_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase URL and Service Key must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_llm_enrichment(batch):
    """Call DeepSeek to infer missing columns for a batch of offices."""
    if not DEEPSEEK_API_KEY:
        logger.warning("No DEEPSEEK_API_KEY. Skipping LLM enrichment.")
        return []

    prompt = f"""You are a Kenya Geodata Expert. For each IEBC office, fill the missing columns.
Inference rules:
- clean_office_location: A professional, clear version of the office location string.
- direction_type: Extract preposition (e.g., 'at', 'opposite', 'near', 'inside'). Default: 'at'.
- direction_landmark: The landmark mentioned in directions.
- direction_distance: Numeric distance in meters if mentioned. Default: 0.0.
- landmark_type: Category (e.g., 'government', 'school', 'hospital', 'police', 'commercial').
- landmark_subtype: Specific type (e.g., 'Chiefs Office', 'Primary School', 'Fire Station').
- result_type: Type of geocode result (e.g., 'building', 'point_of_interest').
- importance_score: Rank 0.0 to 1.0 based on how central the location is.

Batch data:
{json.dumps(batch, indent=1)}

Return ONLY a JSON list of objects with these keys: 
[id, clean_office_location, direction_type, direction_landmark, direction_distance, landmark_type, landmark_subtype, result_type, importance_score]
"""

    try:
        resp = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            },
            timeout=60
        )
        resp.raise_for_status()
        content = resp.json()['choices'][0]['message']['content']
        # Extract JSON list
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception as e:
        logger.error(f"LLM Batch failed: {e}")
        return []

def main():
    logger.info("Starting DEEP ENRICHMENT ENGINE. GOHAM.")
    supabase = init_supabase()
    
    # 1. Fetch all 290
    records = supabase.table('iebc_offices').select('*').order('id').execute().data
    logger.info(f"Loaded {len(records)} records for enrichment.")
    
    batch_size = 20
    enriched_data = []
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        batch_lite = [{
            'id': r['id'],
            'constituency': r['constituency'],
            'county': r['county'],
            'office_location': r['office_location'],
            'landmark': r['landmark'],
            'notes': r['notes']
        } for r in batch]
        
        logger.info(f"Enriching batch {i//batch_size + 1}/{(len(records)//batch_size)+1}...")
        results = get_llm_enrichment(batch_lite)
        
        for r in results:
            # Map back queries
            orig = next((x for x in batch if x['id'] == r['id']), None)
            if orig:
                q = f"{orig['constituency']} {orig['office_location']} {orig['county']} Kenya"
                r['geocode_queries'] = q
                r['geocode_query'] = q
                r['successful_geocode_query'] = q
                r['total_queries_tried'] = 1
                r['geocode_status'] = 'success'
                
                # Push back to Supabase
                try:
                    supabase.table('iebc_offices').update(r).eq('id', r['id']).execute()
                except Exception as ex:
                    logger.error(f"Update failed for ID {r['id']}: {ex}")

    logger.info("DEEP ENRICHMENT COMPLETE. GOHAM.")

if __name__ == "__main__":
    main()
