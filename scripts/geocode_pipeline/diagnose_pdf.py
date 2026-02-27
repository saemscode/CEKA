import pdfplumber
from pathlib import Path

# Fix path to match the actual file structure
PDF_PATH = Path("scripts/data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")

# If we are running from d:/CEKA/RECALL254, the path should be direct
if not PDF_PATH.exists():
    PDF_PATH = Path("data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")
if not PDF_PATH.exists():
    PDF_PATH = Path("d:/CEKA/RECALL254/scripts/data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")
if not PDF_PATH.exists():
    PDF_PATH = Path("d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf")

print(f"Using PDF: {PDF_PATH}")
if not PDF_PATH.exists():
    print("PDF NOT FOUND!")
    exit(1)

with pdfplumber.open(PDF_PATH) as pdf:
    print(f"Total Pages: {len(pdf.pages)}")
    for i in range(min(5, len(pdf.pages))):
        print(f"--- Page {i+1} ---")
        text = pdf.pages[i].extract_text()
        if text:
            print(text[:1000])
        else:
            print("No text extracted from this page.")
        print("\n")
