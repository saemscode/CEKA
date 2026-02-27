import pandas as pd
from pathlib import Path

SRC = Path(r"d:\CEKA\ceka v010\CEKA\scripts\full_iebc_extraction.csv")
DST = Path(r"d:\CEKA\RECALL254\scripts\data\processed\raw_iebc_offices.csv")

df = pd.read_csv(SRC)

# Mapping: 
# county -> county
# constituency -> constituency_name
# location -> office_location
# landmark -> landmark
# distance -> distance_from_landmark

df = df.rename(columns={
    "constituency": "constituency_name",
    "location": "office_location",
    "distance": "distance_from_landmark"
})

# Add missing constituency_code
df["constituency_code"] = ""

# Ensure correct column order for geocoder
cols = ["county", "constituency_code", "constituency_name", "office_location", "landmark", "distance_from_landmark"]
df = df[cols]

df.to_csv(DST, index=False)
print(f"Normalized {len(df)} records to {DST}")
