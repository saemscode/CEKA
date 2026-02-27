import json
import pandas as pd
from fuzzywuzzy import fuzz, process
import os

# Paths
GEOJSON_PATH = r"D:\CEKA\ceka v010\CONTEXT - CEKA\DATA\constituencies_with_centroids.geojson"
GEO_CSV_PATH = r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\data\geocoded_iebc_offices.csv"
RAW_CSV_PATH = r"D:\CEKA\ceka v010\CONTEXT - CEKA\DATA\raw_iebc_offices_290.csv"

def analyze():
    print("--- IEBC DATA RECOVERY ANALYSIS ---")
    
    # 1. Load Master Registry from GeoJSON (The 290 target)
    with open(GEOJSON_PATH, 'r') as f:
        data = json.load(f)
    
    master_list = []
    for feat in data['features']:
        p = feat['properties']
        name = p.get('constituency_name') or p.get('constituency')
        code = p.get('constituency_code')
        if name and code:
            master_list.append({'name': name, 'code': int(float(code)), 'county': p.get('county')})
    
    print(f"Master Registry Size: {len(master_list)}")
    
    # 2. Load Geocoded CSV
    if os.path.exists(GEO_CSV_PATH):
        df_geo = pd.read_csv(GEO_CSV_PATH)
        geo_names = df_geo['constituency_name'].fillna('').unique().tolist()
        print(f"Geocoded CSV Unique Names: {len(geo_names)}")
    else:
        print("Geocoded CSV not found!")
        geo_names = []

    # 3. Load Raw CSV
    if os.path.exists(RAW_CSV_PATH):
        df_raw = pd.read_csv(RAW_CSV_PATH)
        raw_names = df_raw['constituency'].fillna('').unique().tolist()
        print(f"Raw CSV Unique Names: {len(raw_names)}")
    else:
        print("Raw CSV not found!")
        raw_names = []

    # 4. Perform Fuzzy Matching
    recovered = []
    missing_names = []
    
    all_source_names = list(set(geo_names + raw_names))
    
    for item in master_list:
        m_name = item['name']
        match = process.extractOne(m_name, all_source_names, scorer=fuzz.token_sort_ratio)
        
        if match and match[1] >= 80:
            recovered.append({
                'master_name': m_name,
                'match_name': match[0],
                'score': match[1],
                'code': item['code']
            })
        else:
            missing_names.append(m_name)

    print(f"Recovered with Fuzzy (>=80%): {len(recovered)}")
    print(f"Still Missing: {len(missing_names)}")
    if missing_names:
        print(f"Sample Missing: {missing_names[:20]}")

    # 5. Output mapping for script implementation
    # (Optional: save to json for the main script to consume)
    mapping = { r['master_name']: r['match_name'] for r in recovered }
    with open('name_recovery_map.json', 'w') as f:
        json.dump(mapping, f, indent=2)
    print("Recovery map saved to name_recovery_map.json")

if __name__ == "__main__":
    analyze()
