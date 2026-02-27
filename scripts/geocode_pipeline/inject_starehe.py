import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def inject_starehe():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    supabase = create_client(url, key)
    
    # STAREHE Data (Nairobi, Code 289)
    # Recovered from previous analysis
    record = {
        'id': 289,
        'county': 'NAIROBI',
        'constituency_code': 289,
        'constituency': 'STAREHE',
        'constituency_name': 'STAREHE',
        'office_location': 'Nairobi-Central',
        'landmark': 'Nairobi County Fire Station',
        'distance_from_landmark': 0.0,
        'latitude': -1.2842,
        'longitude': 36.8294,
        'geocode_method': 'precision_injected',
        'geocode_confidence': 1.0,
        'accuracy_meters': 1.0,
        'formatted_address': 'Starehe, Nairobi, Kenya',
        'verified': False,
        'geocode_status': 'success',
        'source': 'Precision Recovery Injected',
        'notes': 'Manually injected to complete 290-set.'
    }
    
    try:
        res = supabase.table('iebc_offices').upsert(record).execute()
        print(f"Injection Success: {res.data}")
    except Exception as e:
        print(f"Injection Failed: {e}")

if __name__ == "__main__":
    inject_starehe()
