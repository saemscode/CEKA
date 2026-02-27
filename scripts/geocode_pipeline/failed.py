import pandas as pd

# Load geocoded output file
df = pd.read_csv("scripts/data/processed/geocoded_iebc_offices.csv")

# Filter rows where geocoding failed
failed_df = df[df["latitude"].isna() | df["longitude"].isna()]

# View summary
print(f"Total failed offices: {len(failed_df)}")

# Show first few for inspection
print(failed_df.head(10))

# Optionally export to a separate CSV for manual review
failed_df.to_csv("scripts/data/processed/failed_geocodes.csv", index=False)
