import pdfplumber
from pathlib import Path

# Confirmed path
PDF_PATH = Path("d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf")
OUTPUT_TEXT = Path("d:/CEKA/ceka v010/CEKA/scripts/iebc_all_text.txt")

with pdfplumber.open(PDF_PATH) as pdf:
    with open(OUTPUT_TEXT, "w", encoding="utf-8") as f:
        for i, page in enumerate(pdf.pages):
            f.write(f"--- PAGE {i+1} ---\n")
            f.write(page.extract_text() or "[No text extracted]")
            f.write("\n\n")

print(f"Extraction complete: {OUTPUT_TEXT}")
