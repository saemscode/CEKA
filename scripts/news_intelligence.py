import os
import re
import requests
import io
import json
import time
import logging
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Load environment variables from .env if python-dotenv is available
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
except ImportError:
    pass

try:
    from supabase import create_client, Client
    SUPABASE_OK = True
except ImportError:
    SUPABASE_OK = False
    logging.warning("supabase-py not installed – DB sync disabled.")

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_OK = True
except ImportError:
    PLAYWRIGHT_OK = False
    logging.warning("Playwright not installed – news scraping disabled.")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [NEWS-INTEL] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("news_intelligence.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ===================================================================
#  NEWS SOURCES REGISTRY (TIERED)
# ===================================================================
NEWS_SOURCES = [
    # --- TIER 1: PRIMARY LEGAL RECORD (Source A Nodes) ---
    {
        "name": "Kenya Gazette (Official)",
        "search_url": "https://www.google.com/search?q={query}+site:mygov.go.ke/kenya-gazette",
        "article_selector": "a[href*='mygov.go.ke']",
        "body_selector": "body",
        "headline_selector": "h1, h2",
        "date_selector": "time, .date",
        "domain": "mygov.go.ke",
        "tier": 1
    },
    {
        "name": "Kenya Law (NCLR)",
        "search_url": "http://kenyalaw.org/caselaw/cases/search/?q={query}",
        "article_selector": ".search-result a[href], .views-row a[href]",
        "body_selector": ".case-body, .content, .field-content",
        "headline_selector": "h1, h2.title",
        "date_selector": ".date, time",
        "domain": "kenyalaw.org",
        "tier": 1
    },
    {
        "name": "State House Kenya",
        "search_url": "https://www.google.com/search?q={query}+site:statehouse.go.ke",
        "article_selector": "a[href*='statehouse.go.ke']",
        "body_selector": ".entry-content, article",
        "headline_selector": "h1.entry-title",
        "date_selector": ".entry-date",
        "domain": "statehouse.go.ke",
        "tier": 1
    },

    # --- TIER 2 & 3: ESTABLISHED MEDIA (Source B Nodes) ---
    {
        "name": "Daily Nation",
        "search_url": "https://nation.africa/kenya/search?q={query}",
        "article_selector": "article a[href], .search-result a[href]",
        "body_selector": "article .story-body, .article-body, .story-content",
        "headline_selector": "h1, .story-title",
        "date_selector": "time, .date",
        "domain": "nation.africa",
        "tier": 2
    },
    {
        "name": "The Standard",
        "search_url": "https://www.standardmedia.co.ke/search?q={query}",
        "article_selector": ".article-item a[href], .search-result a[href]",
        "body_selector": "article .body, .article-content, .article-body",
        "headline_selector": "h1, .article-title",
        "date_selector": "time, .date",
        "domain": "standardmedia.co.ke",
        "tier": 2
    },
    {
        "name": "Business Daily Africa",
        "search_url": "https://www.businessdailyafrica.com/search?q={query}",
        "article_selector": ".article-item a[href], .search-result a[href]",
        "body_selector": ".article-body, .story-body",
        "headline_selector": "h1",
        "date_selector": "time, .date",
        "domain": "businessdailyafrica.com",
        "tier": 2
    },
    {
        "name": "Citizen Digital",
        "search_url": "https://citizen.digital/search?q={query}",
        "article_selector": ".story-item a[href], .search-result a[href]",
        "body_selector": ".article-body, .content-story",
        "headline_selector": "h1, .headline",
        "date_selector": ".story-date, time",
        "domain": "citizen.digital",
        "tier": 3
    },
    {
        "name": "KBC Kenya",
        "search_url": "https://www.kbc.co.ke/?s={query}",
        "article_selector": ".entry-title a[href], .post-title a[href]",
        "body_selector": ".entry-content, .post-content",
        "headline_selector": "h1",
        "date_selector": ".entry-date, time",
        "domain": "kbc.co.ke",
        "tier": 3
    },

    # --- TIER 4 & 5: SENTIMENT & DEPTH (Source C Nodes) ---
    {
        "name": "The Star Kenya",
        "search_url": "https://www.the-star.co.ke/search/?q={query}",
        "article_selector": ".article-item a[href], .search-result a[href]",
        "body_selector": "article .body, .article-body",
        "headline_selector": "h1, .article-title",
        "date_selector": "time, .date",
        "domain": "the-star.co.ke",
        "tier": 4
    },
    {
        "name": "Tuko.co.ke",
        "search_url": "https://www.tuko.co.ke/search/?q={query}",
        "article_selector": "a.i-article-link, .search-result a",
        "body_selector": ".post-content, .article-body",
        "headline_selector": "h1",
        "date_selector": "time",
        "domain": "tuko.co.ke",
        "tier": 4
    },
    {
        "name": "Kenyans.co.ke",
        "search_url": "https://www.kenyans.co.ke/search?query={query}",
        "article_selector": ".views-row a[href], .search-result a",
        "body_selector": ".node-content, .article-body",
        "headline_selector": "h1",
        "date_selector": ".date, time",
        "domain": "kenyans.co.ke",
        "tier": 4
    },
    {
        "name": "The Elephant",
        "search_url": "https://www.theelephant.info/search/{query}",
        "article_selector": ".entry-title a[href]",
        "body_selector": ".entry-content, .post-content",
        "headline_selector": "h1",
        "date_selector": "time",
        "domain": "theelephant.info",
        "tier": 5
    },
    {
        "name": "Mzalendo",
        "search_url": "https://info.mzalendo.com/search/?q={query}",
        "article_selector": ".search-results a[href]",
        "body_selector": ".content, .bill-info",
        "headline_selector": "h1",
        "date_selector": ".date",
        "domain": "mzalendo.com",
        "tier": 5
    },
    {
        "name": "Kenyan Wall Street",
        "search_url": "https://kenyanwallstreet.com/?s={query}",
        "article_selector": ".entry-title a[href]",
        "body_selector": ".entry-content",
        "headline_selector": "h1",
        "date_selector": "time",
        "domain": "kenyanwallstreet.com",
        "tier": 5
    }
]



def generate_search_terms(bill_title: str) -> List[str]:
    """
    Generate 4 search term arrangements from a bill title.
    """
    # Clean the title
    clean = re.sub(r'\s+', ' ', bill_title.strip())
    clean = re.sub(r'[,\(\)]', '', clean)

    # Extract key words (no filler)
    words = clean.split()
    significant = [w for w in words if w.lower() not in (
        'the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'by', 'bill', 'act'
    ) and len(w) > 1]

    year_match = re.search(r'\b(20\d{2})\b', bill_title)
    year = year_match.group(1) if year_match else ""

    terms = []

    # Arrangement 1: Full title cleaned
    terms.append(re.sub(r'[,\(\)]', '', bill_title.strip()))

    # Arrangement 2: Key words + "Bill" + year + "Kenya"
    if significant:
        t2 = ' '.join(significant[:4])
        if 'bill' not in t2.lower():
            t2 += ' Bill'
        if year and year not in t2:
            t2 += f' {year}'
        if 'kenya' not in t2.lower():
            t2 += ' Kenya'
        terms.append(t2)

    # Arrangement 3: Abbreviated form (common shorthand)
    # E.g. "Value Added Tax (Amendment) Bill" -> "VAT Amendment Kenya"
    abbreviations = {
        'value added tax': 'VAT',
        'information and communications technology': 'ICT',
        'county government': 'County',
        'public finance management': 'PFM',
        'national health insurance': 'NHIF',
        'social health insurance': 'SHIF',
    }
    abbr_term = clean.lower()
    for full, short in abbreviations.items():
        if full in abbr_term:
            abbr_term = abbr_term.replace(full, short)
    abbr_term = re.sub(r'\b(the|a|an|of|and|for|to|in|on|by|bill|act)\b', '', abbr_term)
    abbr_term = re.sub(r'\s+', ' ', abbr_term).strip()
    if year and year not in abbr_term:
        abbr_term += f' {year}'
    abbr_term += ' Kenya'
    terms.append(abbr_term)

    # Arrangement 4: "Parliament Kenya" + first 2 significant words
    if len(significant) >= 2:
        terms.append(f"Parliament Kenya {significant[0]} {significant[1]} {year}".strip())

    # Deduplicate
    seen = set()
    unique = []
    for t in terms:
        t_clean = re.sub(r'\s+', ' ', t).strip()
        t_lower = t_clean.lower()
        if t_lower not in seen and t_clean:
            seen.add(t_lower)
            unique.append(t_clean)

    return unique[:4]


def content_hash(text: str) -> str:
    """Generate a short hash for deduplication."""
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


class SovereignScraper:
    """
    Multi-provider scraping and search failover system.
    Prioritizes high-quota APIs (ScrapingRobot, ScrapingDog) to minimize local resource burn.
    """
    def __init__(self):
        self.scrapingrobot_key = os.getenv("SCRAPINGROBOT_API_KEY")
        self.scrapingdog_key = os.getenv("SCRAPINGDOG_API_KEY")
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        
        # Endpoints
        self.scrapingrobot_endpoint = "http://api.scraping.rayobyte.com/"
        self.scrapingdog_endpoint = "https://api.scrapingdog.com/scrape"
        self.scrapingdog_google_endpoint = "https://api.scrapingdog.com/google"

    def fetch_html(self, url: str) -> Optional[str]:
        """Fetch full HTML content using tiered proxy providers."""
        
        # 1. Try ScrapingRobot (Rayobyte) - 5,000 credits
        if self.scrapingrobot_key and "your_scraping_robot_key" not in self.scrapingrobot_key:
            try:
                response = requests.post(
                    self.scrapingrobot_endpoint,
                    params={"token": self.scrapingrobot_key},
                    json={"url": url, "module": "HtmlRequestScraper"},
                    timeout=30
                )
                if response.status_code == 200:
                    data = response.json()
                    # Rayobyte structure: result or body
                    html = data.get("result") or data.get("body")
                    if html:
                        logger.info(f"    📡 Scraped via ScrapingRobot: {url[:50]}")
                        return html
            except Exception as e:
                logger.debug(f"    ScrapingRobot failed: {e}")

        # 2. Try ScrapingDog - 1,000 credits
        if self.scrapingdog_key and "your_scraping_dog_key" not in self.scrapingdog_key:
            try:
                response = requests.get(
                    self.scrapingdog_endpoint,
                    params={"api_key": self.scrapingdog_key, "url": url},
                    timeout=30
                )
                if response.status_code == 200:
                    logger.info(f"    🐶 Scraped via ScrapingDog: {url[:50]}")
                    return response.text
            except Exception as e:
                logger.debug(f"    ScrapingDog failed: {e}")

        return None

    def search_google(self, query: str) -> List[Dict[str, str]]:
        """Perform Google Search using tiered API providers."""
        results = []

        # 1. Try SerpApi (Highest Precision)
        if self.serpapi_key:
            try:
                # We use a dynamic import to avoid dependency issues if not installed
                from serpapi import GoogleSearch
                search = GoogleSearch({
                    "q": query,
                    "location": "Kenya",
                    "api_key": self.serpapi_key,
                    "num": 5
                })
                res = search.get_dict()
                if "organic_results" in res:
                    for r in res["organic_results"]:
                        results.append({"url": r.get("link"), "text": r.get("title")})
                    if results:
                        logger.info(f"    🔍 SerpApi hit for query: {query[:40]}")
                        return results
            except Exception as e:
                logger.debug(f"    SerpApi search failed: {e}")

        # 2. Try ScrapingDog Google Search
        if self.scrapingdog_key and "your_scraping_dog_key" not in self.scrapingdog_key:
            try:
                response = requests.get(
                    self.scrapingdog_google_endpoint,
                    params={"api_key": self.scrapingdog_key, "query": query, "results": 5},
                    timeout=30
                )
                if response.status_code == 200:
                    data = response.json()
                    for r in data.get("organic_results", []):
                        results.append({"url": r.get("link"), "text": r.get("title")})
                    if results:
                        logger.info(f"    🔍 ScrapingDog search hit for query: {query[:40]}")
                        return results
            except Exception as e:
                logger.debug(f"    ScrapingDog search failed: {e}")

        return results



class NewsIntelligenceEngine:
    """
    Scrapes Kenyan news sources for mentions of active bills.
    Stores results in the bill_news_mentions Supabase table.
    """

    def __init__(self):
        self.supabase = None
        if SUPABASE_OK:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self.supabase = create_client(url, key)
                logger.info("Supabase client initialized for news intelligence.")

        self.max_articles_per_source = 3
        self.scrape_delay_min = 1.5
        self.scrape_delay_max = 4.0
        
        # Initialize the Sovereign Scraper Failover System
        self.scraper = SovereignScraper()

    def get_active_bills(self) -> List[Dict[str, Any]]:
        """Fetch all bills that are currently being tracked."""
        if not self.supabase:
            logger.error("No Supabase client — cannot fetch bills.")
            return []

        try:
            response = self.supabase.table("bills").select(
                "id, title, status, house, session_year"
            ).neq("status", "Assented").order("created_at", desc=True).limit(50).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch active bills: {e}")
            return []

    def get_existing_mention_hashes(self, bill_id: str) -> set:
        """Get already-stored content hashes for a bill to avoid duplicates."""
        if not self.supabase:
            return set()
        try:
            response = self.supabase.table("bill_news_mentions").select(
                "content_hash"
            ).eq("bill_id", bill_id).execute()
            return {r["content_hash"] for r in (response.data or []) if r.get("content_hash")}
        except Exception as e:
            logger.debug(f"  Could not fetch hashes: {e}")
            return set()

    def store_mention(self, mention: Dict[str, Any]) -> bool:
        """Store a news mention in Supabase."""
        if not self.supabase:
            logger.warning("No Supabase client — cannot store mention.")
            return False

        try:
            self.supabase.table("bill_news_mentions").insert(mention).execute()
            logger.info(f"  💾 Stored: [{mention.get('source_name')}] {mention.get('headline', '')[:60]}")
            return True
        except Exception as e:
            # Ignore duplicate key errors
            if "duplicate" in str(e).lower() or "23505" in str(e):
                logger.info(f"  ⏭️ Duplicate skipped: {mention.get('headline', '')[:60]}")
                return False
            logger.error(f"  Failed to store mention: {e}")
            return False

    def scrape_search_results(self, page, source: Dict, query: str) -> List[Dict[str, str]]:
        """
        Navigate to a news source's search page and extract article links.
        Uses SovereignScraper failover (APIs -> Playwright).
        """
        # 1. Try Sovereign Google Search first for broader reach
        results = self.scraper.search_google(query)
        if results:
            # Filter results to the current source domain
            filtered = [r for r in results if source["domain"] in r["url"]]
            if filtered:
                return filtered[:self.max_articles_per_source]

        # 2. Fallback: Direct Site Scraping via Playwright
        search_url = source["search_url"].format(query=quote_plus(query))
        results = []

        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(2)  # Let dynamic content load

            # Extract article links
            links = page.evaluate("""(selector) => {
                const seen = new Set();
                return Array.from(document.querySelectorAll(selector)).map(a => ({
                    url: a.href,
                    text: a.textContent.trim()
                })).filter(l => {
                    if (!l.url || !l.text || l.text.length < 10) return false;
                    if (seen.has(l.url)) return false;
                    seen.add(l.url);
                    return true;
                });
            }""", source["article_selector"])

            results = links[:self.max_articles_per_source]

        except Exception as e:
            logger.warning(f"    Direct search failed on {source['name']}: {e}")

        return results

    def scrape_article(self, page, url: str, source: Dict) -> Dict[str, str]:
        """
        Visit an article page and extract headline, body text, and date.
        APIs -> Playwright.
        """
        result = {"headline": "", "body": "", "date": "", "url": url}

        # 1. Try Sovereign Scraper (ScrapingRobot/ScrapingDog)
        html = self.scraper.fetch_html(url)
        if html:
            try:
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract headline
                h_el = soup.select_one(source["headline_selector"])
                if h_el: result["headline"] = h_el.get_text().strip()[:500]

                # Extract body
                b_els = soup.select(source["body_selector"])
                if b_els:
                    result["body"] = "\n".join(el.get_text().strip() for el in b_els)[:5000]

                # Extract date
                d_el = soup.select_one(source["date_selector"])
                if d_el:
                    result["date"] = (d_el.get('datetime') or d_el.get_text().strip())[:50]
                
                if result["body"]: return result
            except Exception as e:
                logger.debug(f"    BS4 Parse failed for {url[:50]}: {e}")

        # 2. Fallback: Playwright
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(1)

            # Extract headline
            headline_el = page.query_selector(source["headline_selector"])
            if headline_el:
                result["headline"] = headline_el.inner_text().strip()[:500]

            # Extract body text
            body_els = page.query_selector_all(source["body_selector"])
            if body_els:
                body_text = "\n".join(el.inner_text().strip() for el in body_els)
                result["body"] = body_text[:5000]

            # Extract date
            date_el = page.query_selector(source["date_selector"])
            if date_el:
                date_text = date_el.get_attribute("datetime") or date_el.inner_text().strip()
                result["date"] = date_text[:50]

        except Exception as e:
            logger.warning(f"    Article scrape failed: {url[:80]} — {e}")

        return result

    def run_for_bill(self, page, bill: Dict[str, Any]) -> int:
        """
        Run news intelligence for a single bill across all sources.
        Returns the number of new mentions stored.
        """
        bill_id = bill["id"]
        bill_title = bill["title"]
        search_terms = generate_search_terms(bill_title)
        existing_hashes = self.get_existing_mention_hashes(bill_id)
        new_mentions = 0

        logger.info(f"\n  📰 Bill: {bill_title}")
        logger.info(f"     Search terms: {search_terms}")

        # Group sources by tier to ensure Source A -> Source B -> Source C prioritization
        sorted_sources = sorted(NEWS_SOURCES, key=lambda x: x.get("tier", 5))

        for source in sorted_sources:
            logger.info(f"    🔍 Source Tier {source.get('tier')}: {source['name']}")

            # Try each search term until we get results
            all_links = []
            for term in search_terms:
                links = self.scrape_search_results(page, source, term)
                if links:
                    all_links.extend(links)
                    # For Tiers 1-2, we want precision, so we stop at first successful term
                    if source.get("tier", 5) <= 2:
                        break 
                
                # Random delay between search attempts
                import random
                time.sleep(random.uniform(self.scrape_delay_min, self.scrape_delay_max))

            # Deduplicate by URL
            seen_urls = set()
            unique_links = []
            for link in all_links:
                if link["url"] not in seen_urls:
                    seen_urls.add(link["url"])
                    unique_links.append(link)
            
            # Tier-based volume control
            limit = self.max_articles_per_source
            if source.get("tier") == 1: limit = 5 # Heavily prioritize ground truth
            if source.get("tier") >= 4: limit = 2 # Limit noise from digital-first

            unique_links = unique_links[:limit]

            for link in unique_links:
                # Check if we already have this article
                link_hash = content_hash(link["url"])
                if link_hash in existing_hashes:
                    logger.info(f"      ⏭️ Already have: {link['text'][:50]}...")
                    continue

                # Scrape the article
                article = self.scrape_article(page, link["url"], source)

                if not article["body"].strip() and not article["headline"].strip():
                    logger.info(f"      ⚠️ Empty article, skipping: {link['url'][:60]}")
                    continue

                # Build the mention record
                mention = {
                    "bill_id": bill_id,
                    "source_name": source["name"],
                    "source_domain": source["domain"],
                    "headline": article.get("headline", link.get("text", ""))[:500],
                    "snippet": article.get("body", "")[:2000],
                    "article_url": link["url"],
                    "article_date": article.get("date", ""),
                    "content_hash": link_hash,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                if self.store_mention(mention):
                    new_mentions += 1
                    existing_hashes.add(link_hash)

                # Respectful delay
                import random
                time.sleep(random.uniform(self.scrape_delay_min, self.scrape_delay_max))

        return new_mentions

    def run_full_scan(self):
        """
        Main entry point: fetch all active bills, scrape news for each.
        """
        if not PLAYWRIGHT_OK:
            logger.error("Playwright not installed — cannot run news intelligence.")
            return

        bills = self.get_active_bills()
        if not bills:
            logger.warning("No active bills found. Nothing to scan.")
            return

        logger.info(f"=" * 60)
        logger.info(f"  NEWS INTELLIGENCE ENGINE — Scanning {len(bills)} bills")
        logger.info(f"=" * 60)

        total_mentions = 0

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            )
            page = ctx.new_page()

            for bill in bills:
                try:
                    new = self.run_for_bill(page, bill)
                    total_mentions += new
                except Exception as e:
                    logger.error(f"  Bill scan failed: {bill.get('title', 'unknown')[:50]} — {e}")

            browser.close()

        logger.info(f"\n=== News Intelligence Complete: {total_mentions} new mentions stored ===")


if __name__ == "__main__":
    engine = NewsIntelligenceEngine()
    engine.run_full_scan()
