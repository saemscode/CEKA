import pandas as pd
import re

# Load dataset
input_path = r"D:\CEKA\RECALL254\scripts\data\processed\geocoded_iebc_offices.csv"
output_path = r"D:\CEKA\RECALL254\scripts\data\processed\geocoded_iebc_offices_enhanced.csv"

# Load the file
df = pd.read_csv(input_path)

# List of known multi-word constituencies in Kenya to prevent incorrect splitting
multi_word_constituencies = {
    "Lunga Lunga", "Mathare North", "Kasarani North", "Langata South", "Dagoretti North",
    "Dagoretti South", "Embakasi North", "Embakasi South", "Embakasi Central", "Embakasi East",
    "Embakasi West", "Starehe North", "Starehe South", "Roy Sambu", "Kibra North", "Kibra South",
    "Mvita North", "Mvita South", "Changamwe North", "Changamwe South", "Likoni South", "Likoni North",
    "Moyale Central", "Wajir North", "Mandera South", "Mandera North", "Garissa Township",
    "Kwanza North", "Teso South", "Teso North", "Mumias East", "Mumias West", "Malava Central",
    "Saboti North", "Saboti South"
}

# Function to extract constituency intelligently
def extract_constituency(name):
    if pd.isna(name) or not isinstance(name, str):
        return None
    name_clean = re.sub(r"\s+", " ", name.strip())
    parts = name_clean.split()

    # Check if the start of the name matches a known multi-word constituency
    for c in multi_word_constituencies:
        if name_clean.startswith(c):
            return c

    # Fallback heuristic:
    # If the first two words are identical, return one of them
    if len(parts) > 1 and parts[0].lower() == parts[1].lower():
        return parts[0]

    # Otherwise, assume the first word is the constituency
    return parts[0]

# Apply extraction
df["constituency"] = df["constituency_name"].apply(extract_constituency)

# Save enhanced file
df.to_csv(output_path, index=False)

print(f"Enhanced CSV created at: {output_path}")
print("Preview of extracted constituencies:")
print(df[["constituency_name", "constituency"]].head(20))
