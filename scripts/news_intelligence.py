import os
import re
import time
import json
import logging
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any, Set

# Optional imports for local linting vs GHA runtime
try:
    import requests
except ImportError:
    requests = None

try:
    from multi_llm_orchestrator import MultiLLMOrchestrator
    ORCHESTRATOR_OK = True
except ImportError:
    ORCHESTRATOR_OK = False

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    Client = None

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_OK = True
except ImportError:
    PLAYWRIGHT_OK = False

# ===================================================================
#  Configuration & Logging
# ===================================================================

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
#  Intelligence Sources Tiering
# ===================================================================

NEWS_SOURCES = [
    # TIER 1: Official / Source A
    {"name": "Parliament of Kenya", "domain": "parliament.go.ke", "tier": 1},
    {"name": "Kenya Gazette", "domain": "kenyalaw.org", "tier": 1},
    
    # TIER 2: Established Media / Source B
    {"name": "Daily Nation", "domain": "nation.africa", "tier": 2},
    {"name": "The Standard", "domain": "standardmedia.co.ke", "tier": 2},
    {"name": "The Star", "domain": "the-star.co.ke", "tier": 2},
    {"name": "Business Daily", "domain": "businessdailyafrica.com", "tier": 2},
    {"name": "Capital News", "domain": "capitalfm.co.ke", "tier": 2},
    
    # TIER 3: Digital-First / Source C
    {"name": "Kenyans.co.ke", "domain": "kenyans.co.ke", "tier": 3},
    {"name": "Tuko News", "domain": "tuko.co.ke", "tier": 3},
    {"name": "Citizen Digital", "domain": "citizen.digital", "tier": 3},
]

def generate_search_terms(bill_title: Any) -> List[str]:
    """Generate search term arrangements from a bill title with Pyre-safe types."""
    title_str = str(bill_title).strip()
    clean = re.sub(r'\s+', ' ', title_str)
    clean = re.sub(r'[,\(\)]', '', clean)

    words = clean.split()
    # Explicit list build to satisfy linter
    significant: List[str] = []
    for w in words:
        if w.lower() not in ('the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'by', 'bill', 'act') and len(w) > 1:
            significant.append(str(w))

    year_match = re.search(r'\b(20\d{2})\b', title_str)
    year = year_match.group(1) if year_match else ""

    terms: List[str] = []
    terms.append(str(re.sub(r'[,\(\)]', '', title_str)))

    if significant:
        # Manual slice for Pyre-compliance
        t2_parts = []
        for i in range(min(4, len(significant))):
            t2_parts.append(str(significant[i]))
        t2 = ' '.join(t2_parts)
        if 'bill' not in t2.lower():
            t2 += ' Bill'
        if year and str(year) not in t2:
            t2 += f' {str(year)}'
        if 'kenya' not in t2.lower():
            t2 += ' Kenya'
        terms.append(str(t2))

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
        if str(full).lower() in str(abbr_term).lower():
            abbr_term = str(abbr_term).replace(str(full).lower(), str(short))
    
    abbr_term = re.sub(r'\b(the|a|an|of|and|for|to|in|on|by|bill|act)\b', '', abbr_term)
    abbr_term = re.sub(r'\s+', ' ', abbr_term).strip()
    if year and str(year) not in abbr_term:
        abbr_term += f' {str(year)}'
    abbr_term += ' Kenya'
    terms.append(str(abbr_term))

    if len(significant) >= 2:
        terms.append(f"Parliament Kenya {str(significant[0])} {str(significant[1])} {str(year)}".strip())

    seen: Set[str] = set()
    unique: List[str] = []
    for t in terms:
        tc = str(re.sub(r'\s+', ' ', str(t))).strip()
        tl = tc.lower()
        if tl not in seen and tc:
            seen.add(tl)
            unique.append(tc)
    
    final_unique: List[str] = []
    # Use explicit loop instead of slice to satisfy Pyre2
    for i in range(len(unique)):
        if i >= 4: break
        final_unique.append(str(unique[i]))
    return final_unique

def content_hash(text: Any) -> str:
    """Generate a short hash for deduplication."""
    t_str = str(text) if text is not None else ""
    raw_hash = hashlib.md5(t_str.encode('utf-8')).hexdigest()
    # Manual slice to avoid Pyre warning
    res = ""
    for i in range(min(12, len(raw_hash))):
        res += raw_hash[i]
    return res

class SovereignScraper:
    """Multi-provider scraping and search failover system."""
    def __init__(self):
        self.scrapingrobot_key = os.getenv("SCRAPINGROBOT_API_KEY")
        self.scrapingdog_key = os.getenv("SCRAPINGDOG_API_KEY")
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.scrapingrobot_endpoint = "http://api.scraping.rayobyte.com/"
        self.scrapingdog_endpoint = "https://api.scrapingdog.com/scrape"
        self.scrapingdog_google_endpoint = "https://api.scrapingdog.com/google"

    def fetch_html(self, url: str) -> Optional[str]:
        """Fetch full HTML content using tiered specialization."""
        if requests is None: return None
        s_key = self.scrapingrobot_key
        if s_key and isinstance(s_key, str) and len(s_key) > 5:
            try:
                resp = requests.post(
                    self.scrapingrobot_endpoint,
                    params={"token": s_key},
                    json={"url": url, "module": "HtmlRequestScraper"},
                    timeout=30
                )
                if resp.status_code == 200:
                    d = resp.json()
                    html = d.get("result") or d.get("body")
                    if html: return str(html)
            except Exception: pass
        return None

    def search_google(self, query: str, priority: bool = False) -> List[Dict[str, str]]:
        """Perform Google Search using tiered credit conservation."""
        results: List[Dict[str, str]] = []
        serp_key = self.serpapi_key
        if priority and serp_key and isinstance(serp_key, str) and len(serp_key) > 5:
            try:
                from serpapi import GoogleSearch
                search = GoogleSearch({
                    "q": query, "location": "Kenya", "gl": "ke", "api_key": serp_key, "num": 8
                })
                res = search.get_dict()
                organic = res.get("organic_results", [])
                if isinstance(organic, list):
                    for r in organic:
                        results.append({"url": str(r.get("link", "")), "text": str(r.get("title", ""))})
                    if results: return results
            except Exception: pass

        dog_key = self.scrapingdog_key
        if requests and dog_key and isinstance(dog_key, str) and len(dog_key) > 5:
            try:
                resp = requests.get(
                    self.scrapingdog_google_endpoint,
                    params={"api_key": dog_key, "query": query, "results": 5},
                    timeout=30
                )
                if resp.status_code == 200:
                    d = resp.json()
                    organic = d.get("organic_results", [])
                    if isinstance(organic, list):
                        for r in organic:
                            results.append({"url": str(r.get("link", "")), "text": str(r.get("title", ""))})
                        if results: return results
            except Exception: pass
        return results

class NewsIntelligenceEngine:
    """Orchestrates news harvesting across tiered sources and builds bill intelligence."""
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.scraper = SovereignScraper()
        self.max_articles_per_source = 3
        
        self.supabase: Optional[Client] = None
        if self.supabase_url and self.supabase_key and Client:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception: pass
            
        self.orchestrator = MultiLLMOrchestrator() if ORCHESTRATOR_OK else None

    def get_active_bills(self) -> List[Dict[str, Any]]:
        """Fetch all bills that are currently being tracked."""
        client = self.supabase
        if client is None: return []
        try:
            tbl = client.table("bills")
            res = tbl.select("id, title, status, house, session_year").neq("status", "Assented").order("created_at", desc=True).limit(50).execute()
            return res.data if res and res.data else []
        except Exception: return []

    def get_existing_mention_hashes(self, bill_id: str) -> Set[str]:
        """Get already-stored content hashes for a bill to avoid duplicates."""
        client = self.supabase
        if client is None: return set()
        try:
            tbl = client.table("bill_news_mentions")
            res = tbl.select("content_hash").eq("bill_id", str(bill_id)).execute()
            if res and res.data:
                return {str(r["content_hash"]) for r in res.data if r.get("content_hash")}
        except Exception: pass
        return set()

    def store_mention(self, mention: Dict[str, Any]) -> bool:
        """Store a news mention in Supabase."""
        client = self.supabase
        if client is None: return False
        try:
            tbl = client.table("bill_news_mentions")
            tbl.insert(mention).execute()
            return True
        except Exception: return False

    def scrape_search_results(self, page: Any, source: Dict[str, Any], query: str) -> List[Dict[str, str]]:
        """Navigate to a news source's search page and extract article links."""
        is_priority = str(os.getenv("INCLUDE_NEWS", "false")).lower() == "true"
        search_results = self.scraper.search_google(str(query), priority=is_priority)
        if search_results and isinstance(search_results, list):
            domain = str(source.get("domain", ""))
            filtered: List[Dict[str, str]] = []
            for r in search_results:
                if domain and domain in str(r.get("url", "")):
                    filtered.append(r)
            
            final_filtered: List[Dict[str, str]] = []
            for i in range(min(self.max_articles_per_source, len(filtered))):
                final_filtered.append(filtered[i])
            return final_filtered
        return []

    def summarize_article(self, headline: str, body: str) -> Dict[str, Any]:
        """
        Use Multi-LLM Orchestrator to extract structured civic intelligence from a news article.
        Returns a dict with: what_bill_does, concerns_kenyans_can_raise,
        sentiment, key_stakeholders, tabloid_snippet.
        Falls back to a plain text snippet if the orchestrator is unavailable.
        """
        fallback: Dict[str, Any] = {
            "what_bill_does": str(body)[:500],
            "concerns_kenyans_can_raise": [],
            "sentiment": "neutral",
            "key_stakeholders": [],
            "tabloid_snippet": str(body)[:1000],
        }
        
        if not self.orchestrator:
            return fallback

        system_prompt = """You are a civic intelligence analyst for Kenya. Your audience is everyday Kenyan citizens. They speak English and Swahili.
Extract structured intelligence from the news article provided. 
Return EXACTLY a JSON object with these keys:
{
  "what_bill_does": "<1-2 sentences plain English + Swahili note if relevant>",
  "concerns_kenyans_can_raise": ["<Concern 1 en/sw>", "<Concern 2 en/sw>"],
  "sentiment": "positive|negative|neutral",
  "key_stakeholders": ["<stakeholder 1>", "<stakeholder 2>"],
  "tabloid_snippet": "<3-sentence plain-language summary in English>"
}"""

        prompt = f"Headline: {headline}\n\nContent: {body[:6000]}\n\nReturn ONLY valid JSON."
        
        try:
            parsed = self.orchestrator.get_structured_intelligence(prompt, system_prompt)
            if not parsed: return fallback
            
            # Ensure required keys exist (Preserve legacy structure)
            parsed.setdefault("what_bill_does", fallback["what_bill_does"])
            parsed.setdefault("concerns_kenyans_can_raise", [])
            parsed.setdefault("sentiment", "neutral")
            parsed.setdefault("key_stakeholders", [])
            parsed.setdefault("tabloid_snippet", fallback["tabloid_snippet"])
            return parsed
        except Exception as exc:
            logger.warning(f"[summarize_article] Multi-LLM extraction failed: {exc}")
            return fallback

    def scrape_article(self, page: Any, url: str, source: Dict[str, Any]) -> Dict[str, Any]:
        """Extract headline, body, and date from a news article URL."""
        html = self.scraper.fetch_html(url)
        if not html or BeautifulSoup is None:
            return {"headline": "", "body": "", "date": "", "intelligence": {}}

        try:
            # Explicitly cast BeautifulSoup to Any to avoid "Expected a callable" error
            soup_parser: Any = BeautifulSoup
            soup = soup_parser(html, "html.parser")
            headline = ""
            for tag in ["h1", "title"]:
                found = soup.find(tag)
                if found:
                    headline = str(found.get_text()).strip()
                    break

            paragraphs = soup.find_all("p")
            p_texts = []
            for p in paragraphs:
                pt = str(p.get_text()).strip()
                if len(pt) > 50:
                    p_texts.append(pt)
            body_all = "\n".join(p_texts)

            # Structured intelligence extraction via Gemini
            intelligence: Dict[str, Any] = self.summarize_article(str(headline), str(body_all))
            snippet: str = intelligence.get("tabloid_snippet", body_all[:1000])
            return {
                "headline": str(headline),
                "body": str(snippet),
                "date": "",
                "intelligence": intelligence,
            }
        except Exception:
            return {"headline": "", "body": "", "date": "", "intelligence": {}}

    def _upsert_bill_intelligence(self, bill_id: str, all_concerns: List[str], tabloid_snippets: List[str]) -> None:
        """
        After scanning all articles for a bill, upsert the aggregated
        ai_concerns (JSONB) and tabloid_summary (TEXT) directly into bills table.
        This makes the data immediately available to sovereign_corroborator.
        """
        client = self.supabase
        if client is None:
            return
        try:
            # Deduplicate concerns while preserving order
            seen_c: Set[str] = set()
            unique_concerns: List[str] = []
            for c in all_concerns:
                c_lower = str(c).lower().strip()
                if c_lower and c_lower not in seen_c:
                    seen_c.add(c_lower)
                    unique_concerns.append(str(c).strip())

            # Use the most informative tabloid snippet as the summary
            best_snippet: str = ""
            for sn in tabloid_snippets:
                if len(str(sn)) > len(best_snippet):
                    best_snippet = str(sn)[:2000]

            update_payload: Dict[str, Any] = {}
            if unique_concerns:
                import json as _json
                update_payload["ai_concerns"] = _json.dumps(unique_concerns)
            if best_snippet:
                update_payload["tabloid_summary"] = best_snippet

            if update_payload:
                client.table("bills").update(update_payload).eq("id", bill_id).execute()
                logger.info(f"    [INTEL] Upserted {len(unique_concerns)} concerns + tabloid_summary for bill {bill_id}")
        except Exception as exc:
            logger.warning(f"    [INTEL] Failed to upsert bill intelligence: {exc}")

    def run_for_bill(self, page: Any, bill_data: Dict[str, Any]) -> int:
        """Process news intelligence for a specific bill."""
        bill_id: str = str(bill_data.get("id", ""))
        bill_title: str = str(bill_data.get("title", ""))
        logger.info(f"  🔍 Scanning news: {bill_title[0:60]}...")

        existing_hashes: Set[str] = self.get_existing_mention_hashes(bill_id)
        search_terms = generate_search_terms(bill_title)
        new_mentions_count: int = 0

        # Accumulators for bill-level intelligence
        all_concerns: List[str] = []
        all_tabloid_snippets: List[str] = []

        for query in search_terms:
            for source in NEWS_SOURCES:
                links = self.scrape_search_results(page, source, str(query))
                if not links or not isinstance(links, list):
                    continue

                for link in links:
                    if not isinstance(link, dict):
                        continue
                    url: str = str(link.get("url", ""))
                    if not url:
                        continue

                    l_hash: str = content_hash(url)
                    if l_hash in existing_hashes:
                        continue

                    article = self.scrape_article(page, url, source)
                    body_val: str = str(article.get("body", ""))
                    if not body_val.strip():
                        continue

                    h_str: str = str(article.get("headline") or link.get("text", ""))
                    s_str: str = str(article.get("body", ""))

                    # Pull structured intelligence from the article
                    intelligence: Dict[str, Any] = article.get("intelligence", {})
                    if isinstance(intelligence, dict):
                        concerns = intelligence.get("concerns_kenyans_can_raise", [])
                        if isinstance(concerns, list):
                            all_concerns.extend([str(c) for c in concerns if str(c).strip()])
                        snip = intelligence.get("tabloid_snippet", "")
                        if snip and str(snip).strip():
                            all_tabloid_snippets.append(str(snip).strip())
                        # Use what_bill_does as the canonical snippet for DB
                        what_bill_does: str = str(intelligence.get("what_bill_does", ""))
                        snippet_for_db: str = what_bill_does if what_bill_does else s_str
                    else:
                        snippet_for_db = s_str

                    mention = {
                        "bill_id": bill_id,
                        "source_name": str(source.get("name", "")),
                        "source_domain": str(source.get("domain", "")),
                        "headline": h_str[:500],
                        "snippet": snippet_for_db[:2000],
                        "article_url": url,
                        "article_date": str(article.get("date", "")),
                        "content_hash": l_hash,
                        "scraped_at": datetime.now(timezone.utc).isoformat(),
                    }

                    if self.store_mention(mention):
                        new_mentions_count = int(new_mentions_count + 1)
                        existing_hashes.add(l_hash)
                    time.sleep(1.0)

        # After processing all articles for this bill, upsert intelligence
        if all_concerns or all_tabloid_snippets:
            self._upsert_bill_intelligence(bill_id, all_concerns, all_tabloid_snippets)

        return int(new_mentions_count)

    def run_full_scan(self):
        """Main entry point: fetch all active bills, scrape news for each."""
        if not PLAYWRIGHT_OK: return
        bills = self.get_active_bills()
        if not bills: return

        total: int = 0
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context()
            page = ctx.new_page()
            for bill in bills:
                try:
                    res_count: int = int(self.run_for_bill(page, bill))
                    total = int(total + res_count)
                except Exception: pass
            browser.close()
        logger.info(f"Complete. New: {total}")

if __name__ == "__main__":
    engine = NewsIntelligenceEngine()
    engine.run_full_scan()
