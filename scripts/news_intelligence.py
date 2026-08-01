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

# ---------------------------------------------------------------------------
# Task 3: Env-configurable run-level budget controls
# NEWS_MAX_BILLS_PER_RUN — max bills per run (reduced from hardcoded 100 to 25)
# NEWS_INTEL_BUDGET      — soft wall-clock budget in seconds
# ---------------------------------------------------------------------------
NEWS_MAX_BILLS_PER_RUN: int = int(os.getenv("NEWS_MAX_BILLS_PER_RUN", "25"))
NEWS_INTEL_BUDGET:      int = int(os.getenv("NEWS_INTEL_BUDGET",      "5400"))

# ===================================================================
#  Intelligence Sources Tiering
# ===================================================================

NEWS_SOURCES = [
    # TIER 1: Official / Source A
    {"name": "Parliament of Kenya", "domain": "parliament.go.ke", "tier": 1},
    {"name": "Kenya Gazette", "domain": "kenyalaw.org", "tier": 1},
    {"name": "Mzalendo Watch (X)", "domain": "x.com/MzalendoWatch", "tier": 1},
    
    # TIER 2: Established Media / Source B
    {"name": "Daily Nation", "domain": "nation.africa", "tier": 2},
    {"name": "The Standard", "domain": "standardmedia.co.ke", "tier": 2},
    {"name": "The Star", "domain": "the-star.co.ke", "tier": 2},
    {"name": "Business Daily", "domain": "businessdailyafrica.com", "tier": 2},
    {"name": "Capital News", "domain": "capitalfm.co.ke", "tier": 2},
    {"name": "Amboko JH (X)", "domain": "x.com/AmbokoJH", "tier": 2},
    
    # TIER 3: Digital-First / Source C
    {"name": "Kenyans.co.ke", "domain": "kenyans.co.ke", "tier": 3},
    {"name": "Tuko News", "domain": "tuko.co.ke", "tier": 3},
    {"name": "Citizen Digital", "domain": "citizen.digital", "tier": 3},
    {"name": "Reddit Kenya", "domain": "reddit.com/r/Kenya", "tier": 3},
    {"name": "Reddit Nairobi", "domain": "reddit.com/r/Nairobi", "tier": 3},
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

    # NEW: Swahili Discourse Variants
    sw_triggers = {
        "land": "ardhi", "tax": "kodi", "health": "afya", 
        "election": "uchaguzi", "housing": "nyumba", "school": "shule"
    }
    for en, sw in sw_triggers.items():
        if en in title_str.lower():
            terms.append(f"{sw} Kenya {str(year)}".strip())
            terms.append(f"{sw} Bunge Kenya".strip())

    # Add Social-Media-Focused Hashtags and Queries
    hashtag_title = "".join(w.capitalize() for w in words if w.lower() not in ('the', 'a', 'an', 'of', 'and', 'for', 'to', 'in', 'on', 'by'))
    terms.append(f"#{hashtag_title}")
    
    seen: Set[str] = set()
    unique: List[str] = []
    for t in terms:
        tc = str(re.sub(r'\s+', ' ', str(t))).strip()
        tl = tc.lower()
        if tl not in seen and tc:
            seen.add(tl)
            unique.append(tc)
    
    final_unique: List[str] = []
    # Cap total terms at 12 (Improved)
    for i in range(len(unique)):
        if i >= 12: break 
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
        
        # Improvement 1: ScrapingDog HTML Fallback
        dog_key = self.scrapingdog_key
        if requests and dog_key and isinstance(dog_key, str) and len(dog_key) > 5:
            try:
                resp = requests.get(self.scrapingdog_endpoint, params={"api_key": dog_key, "url": url}, timeout=30)
                if resp.status_code == 200:
                    return resp.text
            except Exception: pass
            
        return None

    def search_google(self, query: str, priority: bool = False) -> List[Dict[str, str]]:
        """Perform Google Search using tiered credit conservation with deep harvesting."""
        results: List[Dict[str, str]] = []
        serp_key = self.serpapi_key
        if priority and serp_key and isinstance(serp_key, str) and len(serp_key) > 5:
            try:
                from serpapi import GoogleSearch
                # Increase depth for priority runs (Full Ham)
                search = GoogleSearch({
                    "q": query, "location": "Kenya", "gl": "ke", "api_key": serp_key, "num": 25 # Increased from 8
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
                    params={"api_key": dog_key, "query": query, "results": 10}, # Increased from 5
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
        self.max_articles_per_source = 10 # Increased for deeper social discourse harvesting
        
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
            # Filter excluding Withdrawn alongside Assented, newest-first, capped at env constant
            res = tbl.select("id, title, status, house, session_year").not_.in_("status", ["Assented", "Withdrawn"]).order("created_at", desc=True).limit(NEWS_MAX_BILLS_PER_RUN).execute()
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
        
        # Improvement 3: Tier Prioritization
        # Sorting is handled at the engine.run_for_bill loop level for efficiency
        
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

        system_prompt = """You are a civic intelligence analyst working for CEKA (Civic Education Kenya). Your readers are ordinary Kenyan citizens — farmers, boda boda riders, teachers, small traders — not lawyers or politicians.

Your job is to extract structured, actionable intelligence from a Kenyan news article about a bill or civic issue.

RULES:
- Write as if explaining to a Form 4 leaver in Nairobi or Kisumu.
- Use English. Include a Swahili phrase only where it adds clarity (e.g. "kodi" for tax, "ardhi" for land).
- Do not speculate. Only extract what is actually in the article.
- Concerns must be specific and actionable — not vague ("citizens should be worried") but precise ("This bill would allow county governments to charge an annual fee for every plot of land, even those already titled").
- Sentiment must reflect the article's tone, not your opinion.

Return EXACTLY this JSON object. No markdown. No preamble. Raw JSON only:
{
  "what_bill_does": "1-2 plain sentences describing what the bill or issue actually does or proposes",
  "concerns_kenyans_can_raise": [
    "Specific concern 1 — name the specific group affected and how",
    "Specific concern 2 — name the specific mechanism that could harm citizens",
    "Specific concern 3 — reference the constitutional right at stake if applicable"
  ],
  "sentiment": "positive|negative|neutral|mixed",
  "key_stakeholders": ["Named institution or group 1", "Named institution or group 2"],
  "tabloid_snippet": "3 sentences. Write like a KTN News anchor — clear, urgent, but factual. No jargon.",
  "source_tier": "official|established_media|digital_media|social"
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

            # Improve 6: Extract article date
            date_val = ""
            # Try <time> tag
            time_tag = soup.find("time", {"datetime": True})
            if time_tag:
                date_val = str(time_tag["datetime"])
            else:
                # Try meta tag
                meta_tag = soup.find("meta", {"property": "article:published_time"}) or soup.find("meta", {"name": "pub_date"})
                if meta_tag:
                    date_val = str(meta_tag.get("content", ""))

            # Structured intelligence extraction via Gemini
            intelligence: Dict[str, Any] = self.summarize_article(str(headline), str(body_all))
            snippet: str = intelligence.get("tabloid_snippet", body_all[:1000])
            return {
                "headline": str(headline),
                "body": str(snippet),
                "date": date_val,
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
            # Improvement 5: Merge instead of overwrite
            existing_data = client.table("bills").select("ai_concerns").eq("id", bill_id).maybe_single().execute()
            existing_concerns = []
            if existing_data and existing_data.data and existing_data.data.get("ai_concerns"):
                try:
                    existing_concerns = json.loads(existing_data.data["ai_concerns"])
                except: existing_concerns = []

            # Deduplicate concerns while preserving order
            all_concerns = existing_concerns + all_concerns
            seen_c: Set[str] = set()
            unique_concerns: List[str] = []
            for c in all_concerns:
                c_lower = str(c).lower().strip()
                if c_lower and c_lower not in seen_c:
                    seen_c.add(c_lower)
                    unique_concerns.append(str(c).strip())

            # Use the most informative tabloid snippet as the summary
            best_snippet: str = ""
            # Fetch existing tabloid summary
            existing_summary = client.table("bills").select("tabloid_summary").eq("id", bill_id).maybe_single().execute()
            if existing_summary and existing_summary.data:
                best_snippet = str(existing_summary.data.get("tabloid_summary", ""))

            for sn in tabloid_snippets:
                if len(str(sn)) > len(best_snippet):
                    best_snippet = str(sn)[:2000]

            update_payload: Dict[str, Any] = {}
            if unique_concerns:
                update_payload["ai_concerns"] = json.dumps(unique_concerns)
            if best_snippet:
                update_payload["tabloid_summary"] = best_snippet

            if update_payload:
                client.table("bills").update(update_payload).eq("id", bill_id).execute()
                logger.info(f"    [INTEL] Merged {len(unique_concerns)} concerns + tabloid_summary for bill {bill_id}")
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
        
        # Accumulators for bill-level intelligence (Restored)
        all_concerns: List[str] = []
        all_tabloid_snippets: List[str] = []

        # Improvement 4: Per-bill credit guard
        max_scrapes_per_bill = 30
        scrapes_consumed = 0

        # Improvement 3: Tier Prioritization
        sorted_sources = sorted(NEWS_SOURCES, key=lambda x: x["tier"])

        for query in search_terms:
            if scrapes_consumed >= max_scrapes_per_bill: break
            for source in sorted_sources:
                if scrapes_consumed >= max_scrapes_per_bill: break
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

                    scrapes_consumed += 1 # Improvement 4
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

    # ================================================================
    #  NEW: Added missing run_full_scan method
    # ================================================================
    def run_full_scan(self):
        """Main entry point: fetch all active bills, scrape news, and discover new topics."""
        if not PLAYWRIGHT_OK:
            logger.error("Playwright not installed — cannot run news intelligence.")
            return
        bills = self.get_active_bills()
        if not bills:
            logger.info("No active bills found. Nothing to scan.")
            return

        logger.info(
            f"[NEWS-INTEL] Starting scan: {len(bills)} bill(s) "
            f"(budget: {NEWS_INTEL_BUDGET}s, cap: {NEWS_MAX_BILLS_PER_RUN} bills)."
        )
        total_mentions = 0
        _run_start = time.time()

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context()
            page = ctx.new_page()
            for i, bill in enumerate(bills):
                # -- Task 3: Soft-deadline check -----------------------------------
                _elapsed = time.time() - _run_start
                if _elapsed >= NEWS_INTEL_BUDGET:
                    logger.info(
                        f"[Budget] Soft deadline reached after {_elapsed:.0f}s "
                        f"(limit: {NEWS_INTEL_BUDGET}s). "
                        f"Processed {i}/{len(bills)} bills. Stopping cleanly."
                    )
                    break
                # -- End soft-deadline check ----------------------------------------
                try:
                    new_mentions = self.run_for_bill(page, bill)
                    total_mentions += new_mentions
                except Exception as e:
                    logger.error(f"Error processing bill {bill.get('id')}: {e}")
            browser.close()

        logger.info(f"[NEWS-INTEL] Scan complete. New mentions: {total_mentions}")

CIVIC_KEYWORDS = [
    # Legislature & Law
    "Bill", "Act", "Parliament", "Senate", "National Assembly", "County Assembly",
    "Constitutional", "Amendment", "Gazette", "Statutory", "Regulation", "Policy",
    "Law", "Legislation", "Hansard", "Motion", "Petition", "Referendum",
    "Reading", "Assented", "Enactment", "Repeal", "Clause", "Schedule",

    # Judiciary & Justice
    "Judiciary", "High Court", "Supreme Court", "Court of Appeal", "Magistrate",
    "Ruling", "Judgment", "Injunction", "Contempt", "Acquittal", "Sentence",
    "DCI", "DPP", "ODPP", "LSK", "Prosecution", "Arrest", "Detention",
    "Bail", "Extradition", "Inquest",

    # Public Finance
    "Budget", "Finance Bill", "Treasury", "National Treasury", "Taxation",
    "Levy", "KRA", "Excise", "VAT", "PAYE", "Withholding Tax", "Digital Tax",
    "Audit", "Auditor General", "Supplementary Budget", "Appropriation",
    "Expenditure", "Public Debt", "Eurobond", "IMF", "World Bank", "CRA",
    "Equalisation Fund", "Conditional Grant", "Own Source Revenue",

    # Accountability & Governance
    "EACC", "Corruption", "Graft", "Bribery", "Embezzlement", "Misappropriation",
    "Accountability", "Transparency", "Oversight", "Public Participation",
    "Ombudsman", "CAJ", "IPOA", "KNCHR", "Ethics", "Conflict of Interest",
    "Vetting", "Impeachment", "Censure",

    # Devolution & County
    "Devolution", "County", "Governor", "Senator", "MCA", "Ward",
    "County Government", "Intergovernmental", "CRA", "County Budget",
    "County Assembly", "Petition County", "Ward Development Fund",

    # Elections & IEBC
    "IEBC", "Elections", "By-election", "Voter Registration", "Electoral",
    "Returning Officer", "Tallying", "Rigging", "Nomination", "Party Primary",
    "Campaign Finance", "ORPP", "Political Party",

    # Land & Property
    "Land", "Title Deed", "NLC", "Land Commission", "Eviction", "Compulsory Acquisition",
    "Land Rates", "Survey", "Squatter", "Community Land", "Encroachment",

    # Health
    "SHIF", "SHA", "NHIF", "Social Health", "Universal Health Coverage", "UHC",
    "Health Levy", "Drug", "KEBS", "KEPHIS", "Pharmacy", "Hospital",
    "Maternal", "Reproductive Health", "Mental Health Bill",

    # Education
    "Education", "CBC", "KNEC", "TSC", "University Fee", "HELB", "School",
    "Teacher", "TVET", "Scholarship", "Capitation", "Free Education",

    # Security & Human Rights
    "Police", "GSU", "KDF", "Human Rights", "Enforced Disappearance",
    "Abduction", "Extrajudicial", "Brutality", "Protest", "Demonstration",
    "Strike", "Crackdown", "Teargas", "Detainee", "Whistleblower",

    # Economy & Trade
    "CBK", "Central Bank", "Interest Rate", "Inflation", "Shilling",
    "Exchange Rate", "CMA", "NSE", "SGR", "PPP", "Privatisation",
    "Parastatal", "Tender", "Procurement", "PPRA", "Single Source",
    "Affordable Housing", "Hustler Fund", "MSME",

    # Digital & Technology
    "eCitizen", "Digital Service Tax", "Data Protection", "ODPC",
    "Cybercrime", "NTSA", "Communications Authority", "CA", "Licence",

    # Social & Welfare
    "Unemployment", "Hunger", "Drought", "NEMA", "Water", "Sanitation",
    "Energy", "KPLC", "Power", "Tariff", "Subsidy", "Social Protection",
    "Disability", "Youth Fund", "Women Fund", "Bursary",

    # Named Institutions (catch-all for headlines)
    "MP", "CS", "PS", "CEO", "Auditor", "Inspector General", "IG",
    "Governor", "Cabinet", "State House", "AG", "Solicitor General"
]

CEKA_IMPRINT_PROMPT = """You are the Lead Intelligence Strategist for CEKA (Civic Education Kenya).
Your mission is to surface the 3 most urgent civic topics from Kenyan news headlines that directly affect ordinary Kenyans — not political commentary, not celebrity news, not vague policy discussion.

HARD CRITERIA — a topic MUST meet ALL of these:
1. LEGAL OR INSTITUTIONAL ANCHOR: It must involve a named Kenyan law, bill, institution (IEBC, EACC, NLC, CBK, TSC, DCI, DPP, LSK, KRA, CRA, SRC, KNEC, Parliament, Senate, County Assembly), or constitutional right.
2. CITIZEN IMPACT: It must change something a Kenyan citizen directly experiences — taxes, health, land, school fees, elections, public safety, employment, or basic rights.
3. VERIFIABLE: It must reference something that can be looked up — a bill number, gazette notice, court ruling, audit report, or official statement.
4. NOT ALREADY ABSTRACT: Do not pick topics that are pure commentary, opinion, or party politics with no policy/legal substance.

TONE RULES:
- Topic names must be plain, direct English. No jargon. No dramatic language.
- Bad example: "The Hubris of Parliament's Sovereignty Vault"
- Good example: "New Tax on Digital Payments Explained"

OUTPUT: Return EXACTLY a JSON array of 3 objects. No markdown. No preamble. Raw JSON only.
[
  {
    "name": "Short plain-English title (max 10 words)",
    "description": "2 sentences. Sentence 1: what happened. Sentence 2: why an ordinary Kenyan should care.",
    "keywords": ["3 to 5 specific tags, not generic"],
    "priority": "high|normal",
    "civic_hook": "One sentence: the single most important question this topic raises for citizens"
  }
]"""

class TrendingTopicDiscovery:
    """Autonomous engine to discover and queue trending civic blog topics."""
    def __init__(self, engine: Any):
        self.engine = engine
        self.supabase = engine.supabase
        self.orchestrator = engine.orchestrator
        self.scraper = engine.scraper

    def fetch_trending_headlines(self) -> List[str]:
        """Scrape major Kenyan news homepages for current headlines."""
        headlines: Set[str] = set()
        sources_to_scrape = [s for s in NEWS_SOURCES if s["tier"] <= 2]
        
        for source in sources_to_scrape:
            # For discovery, we look at the main domain/news page
            url = f"https://{source['domain']}"
            html = self.scraper.fetch_html(url)
            if not html or BeautifulSoup is None:
                continue
            
            try:
                soup = BeautifulSoup(html, "html.parser")
                # Common headline tags in Kenyan media sites
                for tag in ["h1", "h2", "h3"]:
                    for item in soup.find_all(tag):
                        text = item.get_text().strip()
                        if len(text) > 30 and len(text) < 200:
                            # CEKA Deduction Logic: Only include if it matches our civic footprint
                            if any(k.lower() in text.lower() for k in CIVIC_KEYWORDS):
                                headlines.add(text)
            except Exception as e:
                logger.warning(f"Failed to scrape headlines from {url}: {e}")
        
        return list(headlines)

    def discover_and_queue(self):
        """Identify trending topics and add them to the blog pipeline."""
        if not self.orchestrator or not self.supabase:
            logger.warning("Discovery skipped: Orchestrator or Supabase not available.")
            return

        logger.info("🚀 Starting Autonomous Trending Topic Discovery...")
        raw_headlines = self.fetch_trending_headlines()
        if not raw_headlines:
            logger.warning("No headlines fetched for discovery.")
            return

        # Batch 20 most recent/relevant looking headlines to LLM
        candidate_text = "\n".join(raw_headlines[:40])
        prompt = f"Headlines from Kenyan Media Today:\n\n{candidate_text}\n\nSelect the best 3 CEKA topics."
        
        try:
            topics = self.orchestrator.get_structured_intelligence(prompt, CEKA_IMPRINT_PROMPT)
            if not isinstance(topics, list):
                logger.warning("LLM did not return a list of topics.")
                return

            for t in topics:
                name = t.get("name")
                desc = t.get("description")
                if not name or not desc: continue

                # Deduplication check
                exists = self.supabase.table("content_topics").select("id").eq("name", name).execute()
                if exists.data:
                    logger.info(f"Topic '{name}' already exists. Skipping.")
                    continue

                # Insert into content_topics
                topic_res = self.supabase.table("content_topics").insert({
                    "name": name,
                    "description": desc,
                    "keywords": t.get("keywords", []),
                    "priority": t.get("priority", "normal")
                }).execute()

                if topic_res.data:
                    topic_id = topic_res.data[0]["id"]
                    # Add to content_queue
                    self.supabase.table("content_queue").insert({
                        "topic_id": topic_id,
                        "status": "pending",
                        "priority": t.get("priority", "normal")
                    }).execute()
                    logger.info(f"✅ Discovered & Queued Topic: {name}")

        except Exception as e:
            logger.error(f"Error during Topic Discovery: {e}")

    def run_full_scan(self):
        """Main entry point: fetch all active bills, scrape news, and discover new topics."""
        if not PLAYWRIGHT_OK: return
        bills = self.engine.get_active_bills()
        
        # 1. Legislative Scan (Legacy Logic)
        total: int = 0
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context()
            page = ctx.new_page()
            for bill in bills:
                try:
                    res_count: int = int(self.engine.run_for_bill(page, bill))
                    total = int(total + res_count)
                except Exception: pass
            
            # 2. Autonomous Topic Discovery (New Layer)
            discovery = TrendingTopicDiscovery(self)
            discovery.discover_and_queue()
            
            browser.close()

        # Improvement 9: Release Lock
        if self.engine.supabase:
            self.engine.supabase.table("pipeline_locks").delete().eq("lock_type", "news_intelligence").execute()
            
        logger.info(f"Complete. New mentions: {total}")

if __name__ == "__main__":
    engine = NewsIntelligenceEngine()
    
    # Improvement 9: Global Run Lock
    if engine.supabase:
        # Check for existing lock < 2 hours old
        two_hours_ago = (datetime.now(timezone.utc).timestamp() - 7200)
        lock = engine.supabase.table("pipeline_locks").select("*").eq("lock_type", "news_intelligence").execute()
        if lock.data:
            lock_time = datetime.fromisoformat(lock.data[0]["created_at"]).timestamp()
            if lock_time > two_hours_ago:
                logger.warning("Pipeline is already locked by another process. Exiting.")
                exit(0)
        
        # Acquire Lock
        engine.supabase.table("pipeline_locks").upsert({
            "lock_type": "news_intelligence",
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

    engine.run_full_scan()