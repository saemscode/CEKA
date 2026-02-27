import pdfplumber
import os

paths = [
    "d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf",
    "d:/CEKA/RECALL254/scripts/data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf"
]

for p in paths:
    if os.path.exists(p):
        try:
            with pdfplumber.open(p) as pdf:
                print(f"PDF: {p}")
                print(f"  Pages: {len(pdf.pages)}")
                print(f"  Size: {os.path.getsize(p)} bytes")
        except Exception as e:
            print(f"Error reading {p}: {e}")
    else:
        print(f"NOT FOUND: {p}")
