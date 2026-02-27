import pandas as pd
from fuzzywuzzy import fuzz

expected = {
    'Mombasa': 6, 'Kwale': 4, 'Kilifi': 7, 'Tana River': 3, 'Lamu': 2, 'Taita Taveta': 4,
    'Garissa': 6, 'Wajir': 6, 'Mandera': 6, 'Marsabit': 4, 'Isiolo': 2, 'Meru': 9,
    'Tharaka-Nithi': 3, 'Embu': 4, 'Kitui': 8, 'Machakos': 8, 'Makueni': 6, 'Nyandarua': 5,
    'Nyeri': 6, 'Kirinyaga': 4, "Murang'a": 7, 'Kiambu': 12, 'Turkana': 6, 'West Pokot': 4,
    'Samburu': 3, 'Trans Nzoia': 5, 'Uasin Gishu': 6, 'Elgeyo Marakwet': 4, 'Nandi': 6,
    'Baringo': 6, 'Laikipia': 3, 'Nakuru': 11, 'Narok': 6, 'Kajiado': 5, 'Kericho': 6,
    'Bomet': 5, 'Kakamega': 12, 'Vihiga': 5, 'Bungoma': 9, 'Busia': 7, 'Siaya': 6,
    'Kisumu': 7, 'Homa Bay': 8, 'Migori': 8, 'Kisii': 9, 'Nyamira': 4, 'Nairobi': 17
}

CSV_PATH = r"d:\CEKA\ceka v010\CEKA\scripts\full_iebc_extraction.csv"
df = pd.read_csv(CSV_PATH)

def normalize(s):
    return str(s).replace("’", "'").strip().lower()

df['county_norm'] = df['county'].apply(normalize)

print(f"{'County':<20} | {'Found':<5} | {'Expected':<8} | {'Status'}")
print("-" * 50)

total_found = 0
total_expected = 0

for county, exp in expected.items():
    c_norm = normalize(county)
    # Filter rows by identifying if the normalized county name is in the row's normalized county
    found_df = df[df['county_norm'] == c_norm]
    found = len(found_df)
    status = "OK" if found == exp else f"DIFF {found - exp}"
    print(f"{county:<20} | {found:<5} | {exp:<8} | {status}")
    total_found += found
    total_expected += exp
    
    if found != exp:
        print(f"    -> Found: {', '.join(found_df['constituency'].tolist())}")

print("-" * 50)
print(f"{'TOTAL':<20} | {total_found:<5} | {total_expected:<8}")
