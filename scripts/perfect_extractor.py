import pdfplumber
import pandas as pd
import re
from pathlib import Path
import csv
import os
from fuzzywuzzy import fuzz

# MASTER SOURCE PATH
PDF_PATH = Path(r"C:\users\administrator\Downloads\Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")
OUTPUT_CSV = Path(r"d:\CEKA\ceka v010\CEKA\scripts\full_iebc_extraction.csv")

COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", "Garissa",
    "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu",
    "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a",
    "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu",
    "Elgeyo Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
    "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
    "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
]

def clean_val(text):
    if not text: return ""
    text = str(text).strip().replace('\n', ' ')
    # Fix common mess-ups
    text = text.replace("  ", " ")
    return text.strip()

def extract():
    all_data = []
    current_county = "Mombasa"
    
    if not PDF_PATH.exists():
        print(f"ERROR: PDF not found at {PDF_PATH}")
        return

    print(f"Opening PDF: {PDF_PATH}")
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages[:21]):
            p_num = i + 1
            # Use layout=True to preserve column structure in text
            text = page.extract_text(layout=True)
            if not text: continue
            
            lines = text.split('\n')
            
            for line in lines:
                l_strip = line.strip()
                if not l_strip: continue
                
                # 1. Detect County Change
                # We look at the line and see if it purely contains a county name + "County"
                # Example: "MOMBASA COUNTY"
                potential_county = l_strip.upper().replace("COUNTY", "").strip()
                if len(potential_county) > 3 and len(potential_county) < 30:
                    for county in COUNTIES:
                        if fuzz.ratio(potential_county, county.upper()) > 85:
                            if current_county != county:
                                print(f"  [Page {p_num}] County Switch: {current_county} -> {county}")
                                current_county = county
                            break
                
                # 2. Skip Headers and Noise
                if any(h in l_strip.lower() for h in ["constituency name", "office location", "landmark", "physical locations", "iebc", "page:"]):
                    continue
                
                # 3. Detect Data Row
                # We split by multiple spaces to find columns
                parts = re.split(r'\s{4,}', l_strip)
                
                if len(parts) < 2: continue
                
                # If first part is just a number, shift
                if parts[0].isdigit() and len(parts) > 1:
                    parts = parts[1:]
                
                if len(parts) < 2: continue
                
                const_name = clean_val(parts[0])
                if len(const_name) < 3: continue
                
                # Skip if const_name is just the word "County" or the current county name
                if const_name.lower() == "county" or fuzz.ratio(const_name.upper(), current_county.upper()) > 90:
                    continue

                all_data.append({
                    "county": current_county,
                    "constituency": const_name,
                    "location": clean_val(parts[1]) if len(parts) > 1 else "",
                    "landmark": clean_val(parts[2]) if len(parts) > 2 else "",
                    "distance": clean_val(parts[3]) if len(parts) > 3 else ""
                })

    # Manual relocation for Nairobi (since it often starts on same page as Nyamira)
    df = pd.DataFrame(all_data)
    
    # Nairobi List (Hardcoded to force fix)
    nairobi_consts = ["Westlands", "Dagoretti North", "Dagoretti South", "Langata", "Kibra", 
                      "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North", 
                      "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara", 
                      "Kamukunji", "Starehe", "Mathare"]
    
    for cname in nairobi_consts:
        df.loc[df['constituency'].str.contains(cname, case=False, na=False), 'county'] = 'Nairobi'
    
    # Deduplicate
    df = df.drop_duplicates(subset=['county', 'constituency'])
    
    print(f"\nExtracted: {len(df)}")
    
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    extract()
