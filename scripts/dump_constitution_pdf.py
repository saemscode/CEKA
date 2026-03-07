import pdfplumber
from pathlib import Path

PDF_PATH = Path("d:/CEKA/ceka v010/CONTEXT - CEKA/The_Constitution_of_Kenya_2010.pdf")
OUTPUT_TEXT = Path("d:/CEKA/ceka v010/CEKA/scripts/constitution_full_text.txt")

try:
    with pdfplumber.open(PDF_PATH) as pdf:
        with open(OUTPUT_TEXT, "w", encoding="utf-8") as f:
            for i, page in enumerate(pdf.pages):
                f.write(f"--- PAGE {i+1} ---\n")
                f.write(page.extract_text() or "[No text extracted]")
                f.write("\n\n")
    print(f"Extraction complete: {OUTPUT_TEXT}")
except Exception as e:
    print(f"Error extracting PDF: {e}")
