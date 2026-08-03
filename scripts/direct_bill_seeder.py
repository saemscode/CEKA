"""
direct_bill_seeder.py — Lightweight Parliament Bill Seeder
===========================================================
PURPOSE:
    Fallback bill seeder using plain HTTP requests + BeautifulSoup.
    No Playwright, no proxies, no Cloudflare bypass required.
    
    Writes legislation_sync_*.json to processed_data/legislative/
    which sync_to_supabase.py then picks up.

USAGE:
    python scripts/direct_bill_seeder.py
    python scripts/direct_bill_seeder.py --limit 200
    python scripts/direct_bill_seeder.py --sync
"""

import os, sys, re, json, time, logging, argparse, io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [DIRECT-SEEDER] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("direct_bill_seeder.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

try:
    import requests
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False

try:
    from bs4 import BeautifulSoup
    BS4_OK = True
except ImportError:
    BS4_OK = False

try:
    import pdfplumber
    PDFPLUMBER_OK = True
except ImportError:
    PDFPLUMBER_OK = False

try:
    import fitz
    FITZ_OK = True
except ImportError:
    FITZ_OK = False

PARLIAMENT_URLS = {
    "national_assembly": "https://www.parliament.go.ke/the-national-assembly/house-business/bills",
    "senate": "https://www.parliament.go.ke/the-senate/house-business/bills",
}

OUTPUT_DIR = "processed_data/legislative"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
]

PDF_LINK_PATTERN = re.compile(r'\.(pdf)(\?[^\"\\s]*)?$', re.IGNORECASE)
BILL_ROUTE_PATTERNS = [r'/download/', r'/files/', r'/uploads/', r'/documents/', r'/sites/default/files/']

def get_random_ua():
    import random
    return random.choice(USER_AGENTS)

def is_pdf_link(href):
    if not href: return False
    if PDF_LINK_PATTERN.search(href): return True
    for p in BILL_ROUTE_PATTERNS:
        if re.search(p, href, re.IGNORECASE): return True
    return False

def clean_title(raw):
    t = raw.strip()
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\.pdf$', '', t, flags=re.IGNORECASE)
    return t

def generate_slug(title):
    slug = title.lower()
    slug = re.sub(r'[()]', '', slug)
    slug = re.sub(r'[^\w\s-]', ' ', slug)
    slug = re.sub(r'[\s_]+', '-', slug.strip())
    slug = slug.strip('-')
    slug = re.sub(r'-{2,}', '-', slug)
    return slug

def extract_year(title):
    m = re.search(r'\b(20\d{2})\b', title)
    return int(m.group(1)) if m else None

def extract_bill_no(text):
    patterns = [
        r'No\.?\s*(\d+)\s+of\s+(20\d{2})',
        r'Bill\s+No\.?\s*(\d+)',
        r'(\d+)\s*/\s*(20\d{2})',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m: return m.group(0).strip()
    return None

def infer_house(source_name):
    if "senate" in source_name.lower(): return "Senate"
    return "National Assembly"

def infer_category(title):
    t = title.lower()
    if any(k in t for k in ["tax","vat","revenue","finance","budget","appropriation","money","pension","insurance"]): return "Finance"
    if any(k in t for k in ["health","medical","hospital","nhif","sha","pharmacy","nurse","clinical"]): return "Healthcare"
    if any(k in t for k in ["school","university","teacher","student","education","curriculum","tvet","training"]): return "Education"
    if any(k in t for k in ["environment","climate","forest","water","land","wildlife","farming","agriculture","mining"]): return "Environment"
    return "Governance"

def infer_status(text):
    upper = text.upper()
    if "PRESIDENTIAL ASSENT" in upper or "ASSENTED" in upper: return "Presidential Assent"
    if "THIRD READING" in upper or "3RD READING" in upper: return "Third Reading"
    if "COMMITTEE STAGE" in upper or "REPORT STAGE" in upper: return "Committee Stage"
    if "SECOND READING" in upper or "2ND READING" in upper: return "Second Reading"
    if "FIRST READING" in upper or "1ST READING" in upper: return "First Reading"
    if "NEGATIVED" in upper: return "Negatived"
    if "WITHDRAWN" in upper: return "Withdrawn"
    return "Publication"

def extract_pdf_text_from_bytes(content):
    if PDFPLUMBER_OK:
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = "\n".join(p.extract_text() or "" for p in pdf.pages)
            if text and len(text) >= 50: return text
        except Exception: pass
    if FITZ_OK:
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
            if text and len(text) >= 50: return text
        except Exception: pass
    return ""


class DirectFetcher:
    def __init__(self):
        self.session = requests.Session()

    def _headers(self):
        return {
            "User-Agent": get_random_ua(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
        }

    def fetch_html(self, url, retries=3):
        for attempt in range(retries):
            try:
                r = self.session.get(url, headers=self._headers(), timeout=30, allow_redirects=True)
                if r.status_code == 200: return r.text
                if r.status_code in (403, 429):
                    time.sleep(5 * (attempt + 1))
            except Exception as e:
                logger.warning(f"  [HTTP] Attempt {attempt+1} failed: {e}")
                time.sleep(2)
        return None

    def fetch_bytes(self, url, retries=3):
        for attempt in range(retries):
            try:
                r = self.session.get(url, headers=self._headers(), timeout=60, allow_redirects=True)
                if r.status_code == 200: return r.content
                time.sleep(3)
            except Exception as e:
                logger.warning(f"  [HTTP] Bytes fetch attempt {attempt+1} failed: {e}")
                time.sleep(2)
        return None

    def fetch_html_via_scraperapi(self, url):
        key = os.environ.get("SCRAPERAPI_KEY", "")
        if not key: return None
        try:
            proxy = f"http://scraperapi:{key}@proxy-server.scraperapi.com:8001"
            r = requests.get(url, proxies={"http": proxy, "https": proxy},
                           headers=self._headers(), timeout=60, verify=False)
            if r.status_code == 200:
                logger.info("  [ScraperAPI] Success via ScraperAPI proxy")
                return r.text
        except Exception as e:
            logger.warning(f"  [ScraperAPI] Fallback failed: {e}")
        return None


def parse_bills_from_html(html, base_url, house, limit=300):
    if not BS4_OK:
        logger.error("BeautifulSoup4 required for HTML parsing")
        return []
    
    soup = BeautifulSoup(html, "html.parser")
    bills = []
    seen = set()
    
    all_links = soup.find_all("a", href=True)
    
    for link in all_links:
        href = link["href"]
        text = link.get_text(separator=" ", strip=True)
        
        if not text or len(text) < 4: continue
        
        abs_url = urljoin(base_url, href)
        is_pdf = is_pdf_link(abs_url)
        
        bill_keywords = ["bill", "act", "amendment", "finance", "regulations"]
        has_bill_keyword = any(kw in text.lower() for kw in bill_keywords)
        
        if not (is_pdf or has_bill_keyword): continue
        
        title = clean_title(text)
        if not title or len(title) < 5:
            path = unquote(urlparse(abs_url).path)
            title = clean_title(os.path.basename(path))
        
        if not title or len(title) < 5: continue
        
        key = re.sub(r'[^a-z0-9]', '', title.lower())
        if key in seen: continue
        seen.add(key)
        
        record = {
            "title":    title,
            "slug":     generate_slug(title),
            "house":    infer_house(house),
            "category": infer_category(title),
            "status":   "Publication",
            "url":      abs_url,
            "pdf_url":  abs_url if is_pdf else None,
            "source":   f"Parliament Direct ({house})",
            "session_year": extract_year(title),
            "bill_no":  extract_bill_no(title),
        }
        bills.append(record)
        if len(bills) >= limit: break
    
    logger.info(f"  → Parsed {len(bills)} bills from {house} HTML")
    return bills


def enrich_with_pdf_text(bill, fetcher):
    pdf_url = bill.get("pdf_url")
    if not pdf_url: return bill
    logger.info(f"    [PDF] Downloading: {pdf_url[:80]}")
    content = fetcher.fetch_bytes(pdf_url)
    if not content: return bill
    text = extract_pdf_text_from_bytes(content)
    if text and len(text) >= 50:
        bill["text_content"] = text[:50000]
        detected = infer_status(text)
        if detected != "Publication": bill["status"] = detected
        if not bill.get("bill_no"): bill["bill_no"] = extract_bill_no(text)
    time.sleep(0.5)
    return bill


class DirectBillSeeder:
    def __init__(self, limit=300, enrich_pdfs=False):
        self.limit = limit
        self.enrich_pdfs = enrich_pdfs
        self.fetcher = DirectFetcher()
        self.bills = []
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def scrape_house(self, house_key):
        url = PARLIAMENT_URLS.get(house_key)
        if not url:
            logger.error(f"Unknown house key: {house_key}")
            return []
        
        logger.info(f"  [Scrape] Fetching {house_key}: {url}")
        html = self.fetcher.fetch_html(url)
        
        if html:
            cf_signs = ["cf-browser-verification","challenge-platform","Just a moment","Enable JavaScript and cookies"]
            if any(sign in html for sign in cf_signs):
                logger.warning(f"  [CF] Cloudflare detected for {house_key}, trying ScraperAPI...")
                html = self.fetcher.fetch_html_via_scraperapi(url)
        
        if not html:
            logger.error(f"  [Scrape] Failed to get HTML for {house_key}")
            return []
        
        return parse_bills_from_html(html, url, house_key, limit=self.limit)

    def run(self, houses=None):
        logger.info("=" * 70)
        logger.info("[DIRECT-SEEDER] Starting direct bill seed run")
        logger.info(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)

        target_houses = houses or list(PARLIAMENT_URLS.keys())
        
        for house_key in target_houses:
            logger.info(f"\n>>> Seeding: {house_key}")
            bills = self.scrape_house(house_key)
            
            if self.enrich_pdfs:
                enriched = []
                for i, bill in enumerate(bills[:30]):
                    logger.info(f"  [{i+1}/{min(len(bills),30)}] {bill['title'][:60]}")
                    enriched.append(enrich_with_pdf_text(bill, self.fetcher))
                bills = enriched + bills[30:]
            
            self.bills.extend(bills)
            logger.info(f"  → Total bills so far: {len(self.bills)}")
            time.sleep(2)
        
        return self.bills

    def save(self):
        if not self.bills:
            logger.warning("[DIRECT-SEEDER] No bills to save.")
            return None
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        fpath = os.path.join(OUTPUT_DIR, f"legislation_sync_{ts}.json")
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(self.bills, f, indent=2, ensure_ascii=False)
        logger.info(f"\n[DIRECT-SEEDER] Saved {len(self.bills)} bills -> {fpath}")
        return fpath

    def sync_to_supabase(self):
        if not self.bills:
            logger.warning("[DIRECT-SEEDER] No bills to sync.")
            return
        try:
            from supabase import create_client
            url = os.environ.get("SUPABASE_URL", "")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
            if not url or not key:
                logger.warning("[DIRECT-SEEDER] Missing Supabase credentials.")
                return
            supabase = create_client(url, key)
            inserted = updated = failed = 0
            for bill in self.bills:
                try:
                    title = bill.get("title", "")
                    slug = bill.get("slug") or generate_slug(title)
                    record = {k: v for k, v in {
                        "title": title,
                        "slug": slug,
                        "house": bill.get("house"),
                        "category": bill.get("category"),
                        "status": bill.get("status", "Publication"),
                        "url": bill.get("url"),
                        "pdf_url": bill.get("pdf_url"),
                        "summary": f"Legislative tracker: {title}",
                        "updated_at": datetime.now().isoformat(),
                        "text_content": bill.get("text_content"),
                        "bill_no": bill.get("bill_no"),
                        "session_year": bill.get("session_year"),
                    }.items() if v is not None}
                    
                    existing = None
                    try:
                        res = supabase.table("bills").select("id").eq("slug", slug).limit(1).execute()
                        if res and res.data: existing = res.data[0]
                    except Exception: pass
                    if not existing:
                        try:
                            res = supabase.table("bills").select("id").eq("title", title).limit(1).execute()
                            if res and res.data: existing = res.data[0]
                        except Exception: pass
                    
                    if existing:
                        supabase.table("bills").update(record).eq("id", existing["id"]).execute()
                        updated += 1
                    else:
                        supabase.table("bills").upsert(record, on_conflict="slug").execute()
                        inserted += 1
                except Exception as e:
                    logger.error(f"  [Sync] Failed '{bill.get('title')}': {e}")
                    failed += 1
            logger.info(f"\n[DIRECT-SEEDER] Supabase sync: Inserted={inserted}, Updated={updated}, Failed={failed}")
        except ImportError:
            logger.warning("[DIRECT-SEEDER] supabase-py not installed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Direct Parliament Bill Seeder — No proxy/Playwright required.")
    parser.add_argument("--limit", type=int, default=300, help="Max bills per house")
    parser.add_argument("--house", type=str, default=None, choices=list(PARLIAMENT_URLS.keys()))
    parser.add_argument("--enrich-pdfs", action="store_true")
    parser.add_argument("--sync", action="store_true", help="Also sync directly to Supabase")
    args = parser.parse_args()
    
    seeder = DirectBillSeeder(limit=args.limit, enrich_pdfs=args.enrich_pdfs)
    houses = [args.house] if args.house else None
    seeder.run(houses=houses)
    seeder.save()
    if args.sync:
        seeder.sync_to_supabase()
