import pdfplumber
import pandas as pd
import re
from pathlib import Path
import csv
import os

# MASTER SOURCE PATH
PDF_PATH = Path(r"C:\users\administrator\Downloads\Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")
OUTPUT_CSV = Path(r"d:\CEKA\ceka v010\CEKA\scripts\full_iebc_extraction.csv")

def extract_ham_data():
    all_records = []
    current_county = "Unknown"
    
    if not PDF_PATH.exists():
        print(f"ERROR: PDF not found at {PDF_PATH}")
        return []

    print(f"Opening PDF: {PDF_PATH}")
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages[:21]):
            p_num = i + 1
            lines = page.extract_text(layout=True).split('\n')
            
            for line in lines:
                l_strip = line.strip()
                if not l_strip: continue
                
                # COUNTY DETECTION
                # If line contains "County" and is short, or starts with a known county pattern
                if "COUNTY" in l_strip.upper() and len(l_strip) < 40:
                    cand = l_strip.split("  ")[0].replace("County", "").replace("COUNTY", "").strip()
                    if cand and "Constituency" not in cand:
                        current_county = cand.title()
                        continue
                
                # SKIP HEADERS
                if any(h in l_strip.lower() for h in ["constituency name", "office location", "landmark", "physical locations", "iebc", "page:"]):
                    continue
                
                # DATA EXTRACTION
                parts = re.split(r'\s{3,}', l_strip)
                if len(parts) < 2: continue
                
                # Handle leading numbers
                if parts[0].isdigit() and len(parts) > 1:
                    parts = parts[1:]
                
                if len(parts) < 2: continue
                
                constituency = parts[0].strip()
                if len(constituency) < 3: continue
                
                # Final check: Don't pick up the word "County" as a constituency
                if constituency.lower() == "county" or (current_county.lower() in constituency.lower() and len(constituency) < len(current_county) + 5):
                    # This might be a county header row that slipped through
                    # But we want to be CAREFUL not to skip actual constituencies
                    # If it's just "Mombasa", and current_county is "Mombasa", skip.
                    if constituency.title() == current_county:
                        continue

                all_records.append({
                    "county": current_county,
                    "constituency": constituency,
                    "location": parts[1].strip() if len(parts) > 1 else "",
                    "landmark": parts[2].strip() if len(parts) > 2 else "",
                    "distance": parts[3].strip() if len(parts) > 3 else ""
                })

    # Deduplicate and Filter
    df = pd.DataFrame(all_records)
    
    # Filter out obvious junk: rows where constituency is just "County" or similar
    df = df[~df['constituency'].str.contains("County", case=False)]
    
    # Deduplicate
    df = df.drop_duplicates(subset=['county', 'constituency'])
    
    print(f"\nRECOVERY RESULTS:")
    print(f"Total Unique Records: {len(df)}")
    print(f"Counties Covered: {df['county'].nunique()}")
    
    if len(df) < 290:
        print(f"WARNING: Still missing {290 - len(df)} constituencies!")
    
    # Save
    df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8')
    print(f"Saved to {OUTPUT_CSV}")
    
    return df

if __name__ == "__main__":
    extract_ham_data()
