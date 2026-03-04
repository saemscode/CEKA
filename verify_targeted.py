"""
End-to-end test: Run the full scraper on a single bill to verify the OCR pipeline.
Targets The Architects Bill specifically.
"""
import sys, io, os, json
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
load_dotenv(dotenv_path=str(Path("d:/CEKA/ceka v010/CEKA/.env")))

from scripts.legislative_scraper import LegislativeScraper

print("=" * 60)
print("  E2E Test: Architects Bill with Remote OCR")
print("=" * 60)

# Create scraper but override targets to only hit NA bills
scraper = LegislativeScraper(headless=True)

# Run with max_pages=1 to be quick
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    page = ctx.new_page()

    # Go to the page where Architects Bill is listed
    url = "https://www.parliament.go.ke/the-national-assembly/house-business/bills?title=Architects&field_parliament_value=2022"
    page.goto(url, wait_until="networkidle", timeout=60000)
    print("Listing page loaded.")

    # Find the Architects Bill row
    rows = page.evaluate("""() => {
        const rowSelector = '.views-row, tr:has(a)';
        return Array.from(document.querySelectorAll(rowSelector)).map(row => {
            const links = Array.from(row.querySelectorAll('a')).map(a => ({
                text: a.textContent.trim(),
                href: a.href,
                isPdf: a.href.toLowerCase().endsWith('.pdf')
            }));
            return { rowText: row.innerText.trim(), links };
        }).filter(r => r.links.some(l => l.isPdf));
    }""")

    target_row = next((r for r in rows if 'architect' in r['rowText'].lower()), None)
    if not target_row:
        print("ERROR: Architects Bill not found on listing page!")
        browser.close()
        sys.exit(1)

    pdf_link = next(l for l in target_row['links'] if l['isPdf'])
    detail_link = next((l for l in target_row['links'] if not l['isPdf'] and 'node/' in l['href']), None)

    print(f"PDF link: {pdf_link['href']}")
    print(f"Detail link: {detail_link['href'] if detail_link else 'None'}")

    target = {"name": "National Assembly Bills", "type": "bills", "url": url}
    record = scraper._deep_process_bill(
        page,
        scraper._clean_title(pdf_link['text'] or "The Architects Bill, 2026"),
        pdf_link['href'],
        detail_link['href'] if detail_link else None,
        target
    )

    browser.close()

print("\n" + "=" * 60)
print("  RECORD OUTPUT")
print("=" * 60)
# Print key fields
for key in ['title', 'sponsor', 'status', 'house', 'summary', 'description']:
    val = record.get(key, "")
    if isinstance(val, str) and len(val) > 200:
        val = val[:200] + "..."
    print(f"  {key}: {val}")

print(f"\n  text_content length: {len(record.get('text_content', '') or '')}")
print(f"  metadata: {json.dumps(record.get('metadata', {}), indent=4)}")

# OCR Metrics
metrics = scraper.ocr_engine.get_metrics()
print(f"\n--- OCR Metrics ---")
print(json.dumps(metrics, indent=2))
