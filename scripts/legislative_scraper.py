import os
import sys
import time
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urljoin, unquote

# Set up logging with utf-8 encoding to avoid errors on Windows
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("legislative_scrape.log", encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Try to import optional PDF text extraction libraries
try:
    import requests
    from PyPDF2 import PdfReader
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logging.warning("PyPDF2 not installed. PDF text extraction will be skipped.")


class LegislativeScraper:
    """
    GO-HAM Legislative Scraper for the Kenyan Parliament website.
    """

    def __init__(self, headless=True, extract_pdf_text=True):
        self.targets_file = "scripts/scraping_targets.json"
        self.headless = headless
        self.extract_pdf_text = extract_pdf_text and PDF_SUPPORT
        self.data = []
        self.seen_titles = set()
        self.targets = self.load_targets()

    def load_targets(self):
        try:
            with open(self.targets_file, 'r') as f:
                return json.load(f).get("targets", [])
        except Exception as e:
            logging.error(f"Failed to load targets: {e}")
            return []

    def scrape_all(self, max_pages=15):
        logging.info("Initializing GO-HAM Legislative Sync Engine (Scheduled @ 09:00 EAT)")
        logging.info(f"   Targets: {len(self.targets)}, Max pages per target: {max_pages}")

        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logging.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
            return self._scrape_with_requests(max_pages)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            )
            page = context.new_page()

            for target in self.targets:
                logging.info(f"Searching in: {target['name']}...")
                try:
                    if target['type'] == "bills":
                        self._extract_bills_playwright(page, target, max_pages)
                    elif target['type'] == "order_papers":
                        self._extract_order_papers_playwright(page, target)
                    elif target['type'] == "gazette":
                        self._extract_gazette_playwright(page, target)
                except Exception as e:
                    logging.error(f"Failed to scrape {target['name']}: {str(e)}")

            browser.close()

        logging.info(f"Total items scraped: {len(self.data)}")
        return self.data

    def _scrape_with_requests(self, max_pages):
        try:
            import requests
            from bs4 import BeautifulSoup
        except ImportError:
            logging.error("requests/beautifulsoup4 not installed")
            return self.data

        for target in self.targets:
            if target['type'] != 'bills':
                continue

            logging.info(f"Scraping (requests fallback): {target['name']}")
            base_url = target['url']

            for page_num in range(0, max_pages):
                page_url = f"{base_url}?title=%20&field_parliament_value=2022&page={page_num}"
                logging.info(f"   Page {page_num + 1}: {page_url}")

                try:
                    resp = requests.get(page_url, timeout=30, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0'
                    })
                    if resp.status_code != 200:
                        logging.warning(f"   HTTP {resp.status_code} for {page_url}")
                        break

                    soup = BeautifulSoup(resp.text, 'html.parser')
                    self._extract_bills_from_soup(soup, target, base_url)

                    next_link = soup.select_one('li.pager-next a, li.next a, a[rel="next"]')
                    if not next_link:
                        logging.info(f"   No more pages after page {page_num + 1}")
                        break

                    time.sleep(1)

                except Exception as e:
                    logging.error(f"   Failed page {page_num + 1}: {e}")
                    break

        logging.info(f"Total items scraped: {len(self.data)}")
        return self.data

    def _extract_bills_from_soup(self, soup, target, base_url):
        all_links = soup.find_all('a', href=True)

        for link in all_links:
            href = link['href']
            if not href.lower().endswith('.pdf'):
                continue
            if 'petition' in href.lower() or 'contact' in href.lower():
                continue

            full_url = urljoin(base_url, href)
            title = self._clean_bill_title(link.get_text(strip=True) or self._title_from_url(href))

            if not title or title in self.seen_titles:
                continue

            self.seen_titles.add(title)
            bill = self._build_bill_record(title, full_url, target)
            self.data.append(bill)
            logging.info(f"   - {title}")

    def _extract_bills_playwright(self, page, target, max_pages):
        base_url = target['url']

        for page_num in range(0, max_pages):
            page_url = f"{base_url}?title=%20&field_parliament_value=2022&page={page_num}"
            logging.info(f"   Page {page_num + 1}: {page_url}")

            try:
                page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(3000)

                pdf_links = page.evaluate("""() => {
                    const links = document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf"]');
                    return Array.from(links).map(a => ({
                        href: a.href,
                        text: a.textContent.trim(),
                        outerHTML: a.outerHTML
                    })).filter(l =>
                        !l.href.includes('petition') &&
                        !l.href.includes('contact') &&
                        l.text.length > 0
                    );
                }""")

                if not pdf_links:
                    logging.info(f"   No PDF links found on page {page_num + 1}. Trying alternate selectors...")
                    pdf_links = page.evaluate("""() => {
                        const container = document.querySelector('.view-content, .field-items, article, main');
                        if (!container) return [];
                        const links = container.querySelectorAll('a[href$=".pdf"], a[href*=".pdf"]');
                        return Array.from(links).map(a => ({
                            href: a.href,
                            text: a.textContent.trim(),
                            outerHTML: a.outerHTML
                        })).filter(l => !l.href.includes('petition') && !l.href.includes('contact'));
                    }""")

                if not pdf_links:
                    logging.warning(f"   Still no links found on page {page_num + 1}. Stopping pagination.")
                    break

                bills_on_page = 0
                for link_data in pdf_links:
                    href = link_data['href']
                    text = link_data['text']

                    title = self._clean_bill_title(text or self._title_from_url(href))
                    if not title or title in self.seen_titles:
                        continue

                    self.seen_titles.add(title)
                    bill = self._build_bill_record(title, href, target)
                    self.data.append(bill)
                    bills_on_page += 1
                    logging.info(f"   - {title}")

                logging.info(f"   Found {bills_on_page} new bills on page {page_num + 1}")

                if bills_on_page == 0:
                    logging.info(f"   No new bills on page {page_num + 1}, stopping.")
                    break

                has_next = page.evaluate("""() => {
                    const nextLink = document.querySelector('li.pager-next a, li.next a, a[rel="next"]');
                    return !!nextLink;
                }""")

                if not has_next:
                    logging.info(f"   No next page link found. Done with {target['name']}.")
                    break

                time.sleep(2)

            except Exception as e:
                logging.error(f"   Error on page {page_num + 1}: {e}")
                break

    def _extract_order_papers_playwright(self, page, target):
        """Extract order papers (NOT PDF parsed)."""
        try:
            page.goto(target['url'], wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3000)

            items = page.evaluate("""(selector) => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).map(el => {
                    const a = el.querySelector('a');
                    return a ? { text: a.textContent.trim(), href: a.href } : null;
                }).filter(Boolean);
            }""", target['selector'])

            for item in items:
                title = f"Order Paper: {item['text']}"
                if title in self.seen_titles:
                    continue
                self.seen_titles.add(title)
                self.data.append({
                    "title": title,
                    "url": item['href'],
                    "pdf_url": item['href'],
                    "source": target['name'],
                    "category": "Order Paper",
                    "status": "Published",
                    "sponsor": "National Assembly",
                    "summary": f"Order Paper: {item['text']}",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "created_at": datetime.now().isoformat()
                })
                logging.info(f"   - {title} (Scraped as-is)")
        except Exception as e:
            logging.error(f"Order Paper error: {e}")

    def _extract_gazette_playwright(self, page, target):
        """Extract gazette notices (NOT PDF parsed)."""
        try:
            page.goto(target['url'], wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3000)

            items = page.evaluate("""(selector) => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).map(el => {
                    const a = el.querySelector('a');
                    return {
                        title: el.textContent.trim().split('\\n')[0],
                        href: a ? a.href : ''
                    };
                });
            }""", target['selector'])

            for item in items:
                title = item['title']
                if not title or title in self.seen_titles:
                    continue
                self.seen_titles.add(title)
                self.data.append({
                    "title": title,
                    "url": item['href'],
                    "pdf_url": item['href'],
                    "source": target['name'],
                    "category": "Gazette",
                    "status": "Notice",
                    "sponsor": "",
                    "summary": f"Kenya Gazette notice: {title}",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "created_at": datetime.now().isoformat()
                })
                logging.info(f"   - {title} (Scraped as-is)")
        except Exception as e:
            logging.error(f"Gazette error: {e}")

    def _download_and_extract_pdf_text(self, pdf_url: str) -> Optional[str]:
        if not self.extract_pdf_text:
            return None
        try:
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            from io import BytesIO
            with BytesIO(response.content) as open_pdf_file:
                reader = PdfReader(open_pdf_file)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text.strip() if text else None
        except Exception as e:
            logging.debug(f"Failed to extract text from {pdf_url}: {e}")
            return None

    def _extract_date_from_url(self, url: str) -> Optional[str]:
        match = re.search(r'/(20\d{2})[-/]?(0[1-9]|1[0-2])?[-/]?(0[1-9]|[12]\d|3[01])?', url)
        if match:
            year = match.group(1)
            month = match.group(2) or "01"
            day = match.group(3) or "01"
            return f"{year}-{month}-{day}"
        return None

    def _extract_pdf_metadata(self, text: str) -> Dict[str, Any]:
        metadata = {"description": None, "summary": None, "sponsor": None, "date": None, "objects": None}
        if not text:
            return metadata

        text = re.sub(r'\n\s*\n', '\n', text)
        desc_match = re.search(r'(?:A Bill for\s+AN ACT[^\n]*?)(.*?)(?=\s+ENACTED\s+by\s+the\s+Parliament\s+of\s+Kenya)', text, re.IGNORECASE | re.DOTALL)
        if desc_match:
            metadata["description"] = "A Bill for AN ACT " + desc_match.group(1).strip()
        else:
            desc_fallback = re.search(r'(A Bill for[^\n]*?)(?=\n\s*\n)', text, re.IGNORECASE | re.DOTALL)
            if desc_fallback:
                metadata["description"] = desc_fallback.group(1).strip()

        objects_match = re.search(r'(?:3\.|Objects of the Act[^\n]*?)\s*(.*?)(?=\n\s*\d+\.|\Z)', text, re.IGNORECASE | re.DOTALL)
        if objects_match:
            metadata["objects"] = objects_match.group(1).strip()

        memo_match = re.search(r'MEMORANDUM\s+OF\s+OBJECTS\s+AND\s+REASONS\s*(.*?)(?=\n\s*\n\s*\n|\Z)', text, re.IGNORECASE | re.DOTALL)
        if memo_match:
            metadata["summary"] = memo_match.group(1).strip()
        else:
            metadata["summary"] = metadata["objects"]

        sponsor_match = re.search(r'([A-Z\'\s]+(?:MP|EGH|CBS|OGW|MBS|HON\.)?(?:,\s*[A-Za-z\s]+)?)\s*Dated\s+the', text[-2000:], re.IGNORECASE)
        if sponsor_match:
            metadata["sponsor"] = sponsor_match.group(1).strip()

        date_match = re.search(r'Dated\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})', text, re.IGNORECASE)
        if date_match:
            day, month_name, year = date_match.groups()
            month_map = {'january':'01','february':'02','march':'03','april':'04','may':'05','june':'06','july':'07','august':'08','september':'09','october':'10','november':'11','december':'12'}
            month = month_map.get(month_name.lower(), '01')
            metadata["date"] = f"{year}-{month}-{day.zfill(2)}"

        return metadata

    def _build_bill_record(self, title: str, url: str, target: dict) -> dict:
        """PDF parsed only for Bills."""
        year = self._extract_year(title) or self._extract_year(url) or str(datetime.now().year)
        status = self._infer_status(title)
        bill_no = self._extract_bill_no(title)
        house = "National Assembly"
        if "Senate" in target['name'] or "senate" in title.lower():
            house = "Senate"
        category = self._infer_category(title)
        
        text_content = None
        pdf_metadata = {}
        
        # User requested: ONLY parse PDF for actual Bills.
        # Check if it's a Bill (not Hansard, not Order Paper)
        is_bill = "bill" in title.lower() and "hansard" not in title.lower() and "order paper" not in title.lower()
        
        if self.extract_pdf_text and is_bill:
            text_content = self._download_and_extract_pdf_text(url)
            if text_content:
                logging.info(f"   (PDF Parsed) {title}")
                pdf_metadata = self._extract_pdf_metadata(text_content)
        else:
            logging.info(f"   (Scraped As-Is) {title}")

        summary = pdf_metadata.get("summary") or pdf_metadata.get("objects") or (text_content[:1000] if text_content else f"Legislative document: {title}")
        description = pdf_metadata.get("description") or summary
        sponsor = pdf_metadata.get("sponsor") or self._extract_sponsor(title)
        bill_date = pdf_metadata.get("date") or self._extract_date_from_url(url) or datetime.now().strftime("%Y-%m-%d")

        return {
            "title": title,
            "bill_no": bill_no,
            "session_year": int(year) if year.isdigit() else datetime.now().year,
            "sponsor": sponsor,
            "status": status,
            "house": house,
            "date": bill_date,
            "url": url,
            "pdf_url": url,
            "source": target['name'],
            "category": category,
            "summary": summary,
            "description": description,
            "text_content": text_content,
            "neural_summary": summary if text_content else None,
            "analysis_status": "pending",
            "peoples_audit_eligible": any(kw in category for kw in ["Finance"]),
            "is_high_impact": any(kw in title for kw in ["Finance", "Constitution", "Land"]),
            "stages": [],
            "comments": [],
            "constitutional_section": ", ".join(set(re.findall(r'\bArticle\s+(\d+(?:[A-Za-z])?)', text_content)[:5])) if text_content else None,
            "sources": [target['url']],
            "views_count": 0,
            "vault_id": None,
            "vault_metadata": {},
            "follow_count": 0,
            "history": [],
            "metadata": {
                "scraped_at": datetime.now().isoformat(),
                "master_pack_version": "2026.Q1.HAM",
                "pdf_metadata": pdf_metadata,
                "is_pdf_parsed": bool(text_content)
            },
            "created_at": datetime.now().isoformat()
        }

    def _clean_bill_title(self, raw: str) -> str:
        if not raw: return ""
        title = re.sub(r'\.(pdf|docx?|html?)$', '', raw, flags=re.IGNORECASE).strip()
        return re.sub(r'\s+', ' ', title).strip()

    def _extract_bill_no(self, text: str) -> str:
        match = re.search(r'(?:Bill\s*)?No\.?\s*(\d+)(?:\s*of\s*(\d{4}))?', text, re.IGNORECASE)
        if match:
            return f"No. {match.group(1)} of {match.group(2)}" if match.group(2) else f"No. {match.group(1)}"
        return ""

    def _title_from_url(self, url: str) -> str:
        filename = unquote(url.split('/')[-1])
        filename = re.sub(r'\.(pdf|docx?|html?)$', '', filename, flags=re.IGNORECASE)
        return re.sub(r'[_-]+', ' ', filename).strip().title()

    def _extract_year(self, text: str) -> str:
        match = re.search(r'\b20(2[0-9]|3[0-9])\b', text)
        return match.group(0) if match else ""

    def _extract_sponsor(self, title: str) -> str:
        t = title.lower()
        if 'senate' in t: return "Senate"
        if 'national assembly' in t: return "National Assembly"
        return "Government"

    def _infer_status(self, title: str) -> str:
        t = title.lower()
        for s in ['assent', 'committee', 'second reading', 'first reading']:
            if s in t: return s
        return "publication"

    def _infer_category(self, title: str) -> str:
        t = title.lower()
        maps = {"Finance": ['finance', 'tax', 'appropriation', 'budget'], "Education": ['education', 'learning'], "Healthcare": ['health', 'medical'], "Environment": ['environment', 'land', 'water'], "Governance Sector": ['parliament', 'judiciary', 'police', 'security', 'election']}
        for cat, keywords in maps.items():
            if any(kw in t for kw in keywords): return cat
        return "All Portfolios"

    def save_data(self, output_dir="processed_data/legislative"):
        os.makedirs(output_dir, exist_ok=True)
        json_path = os.path.join(output_dir, f"legislation_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        logging.info(f"Saved {len(self.data)} records to {json_path}")


if __name__ == "__main__":
    scraper = LegislativeScraper(headless=True, extract_pdf_text=True)
    results = scraper.scrape_all(max_pages=2)
    scraper.save_data()
