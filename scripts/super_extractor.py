import pdfplumber
import pandas as pd
import re
from pathlib import Path
import csv
from fuzzywuzzy import fuzz

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

EXCLUDE_LIST = ["Wamagana", "Makuyu", "County Office", "County Hq", "Sub County", "Total", "Constituency Name", "Office Location", "Landmark", "Distance", "IEBC", "Compound", "Children’s", "Office Along"]

def extract():
    all_data = []
    current_county = "Mombasa"
    
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages[:21]):
            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            if not words: continue
            
            lines = []
            words.sort(key=lambda x: x['top'])
            current_line = [words[0]]
            for w in words[1:]:
                if abs(w['top'] - current_line[-1]['top']) < 3:
                    current_line.append(w)
                else:
                    lines.append(current_line)
                    current_line = [w]
            lines.append(current_line)
            
            for line_words in lines:
                line_words.sort(key=lambda x: x['x0'])
                line_text = " ".join([w['text'] for w in line_words])
                l_strip = line_text.strip()
                
                # COUNTY HEADER
                potential_county = l_strip.upper().replace("COUNTY", "").strip()
                if 3 < len(potential_county) < 30:
                    for count_idx, county in enumerate(COUNTIES):
                        if fuzz.ratio(potential_county, county.upper()) > 90:
                            curr_idx = COUNTIES.index(current_county)
                            if count_idx >= curr_idx:
                                if current_county != county:
                                    current_county = county
                            break

                # DATA ROW
                parts = []
                current_part = [line_words[0]['text']]
                for idx in range(1, len(line_words)):
                    gap = line_words[idx]['x0'] - line_words[idx-1]['x1']
                    if gap > 12: 
                        parts.append(" ".join(current_part))
                        current_part = [line_words[idx]['text']]
                    else:
                        current_part.append(line_words[idx]['text'])
                parts.append(" ".join(current_part))
                
                if len(parts) < 2: continue
                if parts[0].isdigit():
                    parts = parts[1:]
                if len(parts) < 1: continue
                
                const_name = parts[0].strip()
                if len(const_name) < 3: continue
                
                # NOISE FILTERING
                if any(x.lower() in const_name.lower() for x in EXCLUDE_LIST):
                    continue
                
                if fuzz.ratio(const_name.upper(), current_county.upper()) > 95:
                    continue
                
                if "Constituency" in const_name and "Name" in const_name:
                    continue
                
                if len(const_name.split()) > 3:
                    continue

                all_data.append({
                    "county": current_county,
                    "constituency": const_name,
                    "location": parts[1] if len(parts) > 1 else "",
                    "landmark": parts[2] if len(parts) > 2 else "",
                    "distance": parts[3] if len(parts) > 3 else ""
                })

    df = pd.DataFrame(all_data)
    
    trash = ["Office Location", "Landmark", "Distance", "County", "Independent Electoral", "Physical Locations", "IEBC"]
    df = df[~df['constituency'].str.contains('|'.join(trash), case=False, na=False)]
    
    nairobi_consts = ["Westlands", "Dagoretti North", "Dagoretti South", "Langata", "Kibra", 
                      "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North", 
                      "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara", 
                      "Kamukunji", "Starehe", "Mathare"]
    for cname in nairobi_consts:
        df.loc[df['constituency'].str.contains(cname, case=False, na=False), 'county'] = 'Nairobi'
    
    df.loc[df['constituency'].str.contains('Matuga', case=False, na=False), 'county'] = 'Kwale'
    
    df = df.drop_duplicates(subset=['county', 'constituency'])
    
    print(f"\nExtracted: {len(df)}")
    
    if len(df) == 290:
        print("PERFECTION ACHIEVED!")

    df.to_csv(OUTPUT_CSV, index=False)

if __name__ == "__main__":
    extract()
