import pdfplumber
from pathlib import Path
import os

# Try various potential paths for the PDF
possible_paths = [
    "d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf",
    "d:/CEKA/RECALL254/scripts/data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf"
]

PDF_PATH = None
for p in possible_paths:
    if Path(p).exists():
        PDF_PATH = Path(p)
        break

print(f"Using PDF: {PDF_PATH}")
if not PDF_PATH:
    print("PDF NOT FOUND in any of the expected locations!")
    exit(1)

try:
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Total Pages: {len(pdf.pages)}")
        # Check first and last pages
        pages_to_check = [0, 1, len(pdf.pages)-1]
        for i in pages_to_check:
            if i < len(pdf.pages):
                print(f"--- Page {i+1} ---")
                text = pdf.pages[i].extract_text()
                if text:
                    print(text[:1000])
                else:
                    print("No text extracted from this page.")
                print("\n")
except Exception as e:
    print(f"Error opening/reading PDF: {e}")
