import pdfplumber
from pathlib import Path

PDF_PATH = Path("d:/CEKA/NASAKA/Nasaka-IEBC/data/raw/Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf")

with pdfplumber.open(PDF_PATH) as pdf:
    page22 = pdf.pages[21]
    words = page22.extract_words()
    print(f"Page 22 Word Count: {len(words)}")
    for w in words[:100]: # Print first 100 words
        print(f"{w['text']} ", end="")
    print("\n---")
    
    # Try different table strategies
    print("Trying explicit horizontal lines Strategy...")
    table = page22.extract_table({"horizontal_strategy": "lines", "vertical_strategy": "lines"})
    if table:
        print(f"Found {len(table)} rows with explicit strategy")
    else:
        print("Explicit strategy failed.")
        
    print("Trying text strategy...")
    table = page22.extract_table({"horizontal_strategy": "text", "vertical_strategy": "text"})
    if table:
         print(f"Found {len(table)} rows with text strategy")
    else:
         print("Text strategy failed.")
