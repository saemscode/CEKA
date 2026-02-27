import pdfplumber
from pathlib import Path

PDF_PATH = Path("d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf")

total_rows = 0
with pdfplumber.open(PDF_PATH) as pdf:
    for i, page in enumerate(pdf.pages):
        table = page.extract_table()
        if table:
            # Filter out empty rows or headers
            rows = [row for row in table if any(cell and str(cell).strip() for cell in row)]
            # Check for header
            if rows and "Constituency" in str(rows[0]):
                rows = rows[1:] # Skip header
            total_rows += len(rows)
            print(f"Page {i+1}: Found {len(rows)} data rows")
        else:
            print(f"Page {i+1}: No table found")

print(f"\nTOTAL DATA ROWS FOUND: {total_rows}")
