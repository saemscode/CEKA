import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
GEOJSON_FILE = r"D:\CEKA\ceka v010\CONTEXT - CEKA\DATA\constituencies_with_centroids.geojson"

def debug_289():
    with open(GEOJSON_FILE, 'r') as f:
        data = json.load(f)
    
    found = False
    for feat in data['features']:
        p = feat['properties']
        code = p.get('constituency_code')
        if code and int(float(code)) == 289:
            print(f"Code 289 found in GeoJSON: {p}")
            found = True
    
    if not found:
        print("Code 289 NOT FOUND in GeoJSON!")

    # Check database
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    supabase = create_client(url, key)
    
    res = supabase.table('iebc_offices').select('*').eq('id', 289).execute()
    print(f"DB Record for ID 289: {res.data}")
    
    res_starehe = supabase.table('iebc_offices').select('*').ilike('constituency', '%STAREHE%').execute()
    print(f"DB Records for 'STAREHE': {res_starehe.data}")

if __name__ == "__main__":
    debug_289()
