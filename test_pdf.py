import requests
from PyPDF2 import PdfReader
from io import BytesIO
import logging
import sys

# Configure logging to stdout
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)

def test_pdf_extraction(url):
    logging.info(f"Testing extraction from: {url}")
    try:
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        })
        logging.info(f"Status Code: {response.status_code}")
        response.raise_for_status()
        
        with BytesIO(response.content) as open_pdf_file:
            reader = PdfReader(open_pdf_file)
            logging.info(f"Number of Pages: {len(reader.pages)}")
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    logging.info(f"Page {i+1} extracted {len(page_text)} chars")
                    text += page_text + "\n"
                else:
                    logging.info(f"Page {i+1} extraction returned None (this is okay if page is image-based)")
            
            if text:
                logging.info(f"Total extracted text length: {len(text)}")
                print("--- START OF TEXT ---")
                print(text[:2000] + "...")
                print("--- END OF TEXT ---")
            else:
                logging.error("No text extracted from any page. PDF might be a scanned image without OCR.")
                
    except Exception as e:
        logging.error(f"Failed: {e}")

if __name__ == "__main__":
    # Test with the Architects Bill URL provided by user
    test_pdf_extraction("https://www.parliament.go.ke/sites/default/files/2026-03/THE%20ARCHITECTS%20BILL%2C2026.pdf")
