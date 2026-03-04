"""Test PyMuPDF (fitz) and pdfplumber text extraction on scanned Architects Bill."""
import requests, fitz, pdfplumber, io

url = "https://www.parliament.go.ke/sites/default/files/2026-03/THE%20ARCHITECTS%20BILL%2C2026.pdf"
print("Downloading PDF...")
resp = requests.get(url, timeout=30)
print(f"Downloaded {len(resp.content)} bytes")

# Test 1: PyMuPDF (fitz)
print("\n=== PyMuPDF (fitz) ===")
doc = fitz.open(stream=resp.content, filetype="pdf")
fitz_text = ""
for i, page in enumerate(doc):
    if i >= 3: break
    text = page.get_text()
    fitz_text += text
    print(f"  Page {i+1}: {len(text)} chars")
doc.close()
print(f"Total fitz text: {len(fitz_text)} chars")
if fitz_text.strip():
    print("FITZ TEXT (first 2000):")
    print(fitz_text[:2000])
else:
    print("FITZ: No text extracted (scanned image PDF confirmed)")

# Test 2: pdfplumber
print("\n=== pdfplumber ===")
with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
    plumber_text = ""
    for i, page in enumerate(pdf.pages):
        if i >= 3: break
        text = page.extract_text() or ""
        plumber_text += text
        print(f"  Page {i+1}: {len(text)} chars")
    print(f"Total plumber text: {len(plumber_text)} chars")
    if plumber_text.strip():
        print("PLUMBER TEXT (first 2000):")
        print(plumber_text[:2000])
    else:
        print("PLUMBER: No text extracted (scanned image PDF confirmed)")

# Test 3: Try a DIFFERENT bill that we know has text (Power of Mercy)
print("\n=== Testing a text-based bill (Power of Mercy) ===")
url2 = "https://www.parliament.go.ke/sites/default/files/2025-11/The%20Power%20of%20Mercy%20Bill%2C2025.pdf"
resp2 = requests.get(url2, timeout=30)
doc2 = fitz.open(stream=resp2.content, filetype="pdf")
text2 = doc2[0].get_text() if len(doc2) > 0 else ""
print(f"Power of Mercy page 1: {len(text2)} chars")
if text2.strip():
    print(text2[:500])
doc2.close()
