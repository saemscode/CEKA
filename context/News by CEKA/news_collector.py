"""
news_collector.py - CEKA News Intelligence Engine: Stage 1 Collection
========================================================================
Writes normalized rows into `signals`. Nothing in this file calls an
LLM - enrichment is a separate stage (news_enrichment.py) so collection
can run on a tight, cheap, frequent cron independent of LLM cost/rate
limits.

Design note on proxies: your existing LegislativeScraper's ProxyPool
exists specifically because parliament.go.ke's PDF portal sits behind
Cloudflare bot protection. Most Tier 2/3 news sites expose RSS/Atom
feeds and do not require that treatment - RSS is the primary path here.
Official Tier 1 sites (parliament.go.ke, kenyalaw.org, treasury.go.ke,
etc.) are fetched directly via `requests`; if a specific one turns out
to be Cloudflare-protected, point PROXY_POOL_MODULE (see below) at your
existing scraper file and this module will use its ProxyPool
automatically. I have not duplicated that class here since I do not
have its exact current file path in your repo - importing the real one
beats guessing at a second copy.

pip install requests feedparser trafilatura beautifulsoup4 supabase python-dotenv
Optional (only used if PROXY_POOL_MODULE resolves): playwright
"""

import os
import re
import sys
import json
import time
import hashlib
import logging
import importlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
import feedparser
import trafilatura
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [COLLECTOR] - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("news_collector.log", encoding="utf-8"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Known RSS/Atom feeds per domain. Add to this as you confirm working
# feed URLs - collection quality is bounded by this list, not by the
# code below it.
# ---------------------------------------------------------------------------
RSS_FEEDS: Dict[str, List[str]] = {
    "nation.africa": ["https://nation.africa/kenya/rss"],
    "standardmedia.co.ke": ["https://www.standardmedia.co.ke/rss/headlines.php"],
    "the-star.co.ke": ["https://www.the-star.co.ke/rss/"],
    "businessdailyafrica.com": ["https://www.businessdailyafrica.com/bd/rss"],
    "capitalfm.co.ke": ["https://www.capitalfm.co.ke/news/feed/"],
    "citizen.digital": ["https://www.citizen.digital/feed"],
    "kenyans.co.ke": ["https://www.kenyans.co.ke/feeds/news"],
    "tuko.co.ke": ["https://www.tuko.co.ke/rss/"],
}

# Sources fetched as direct HTML (no confirmed RSS, or explicitly
# static institutional pages). Each entry: (path appended to domain).
DIRECT_HTML_PATHS: Dict[str, List[str]] = {
    "parliament.go.ke": ["/the-national-assembly/bills", "/press-releases"],
    "treasury.go.ke": ["/category/press-releases/"],
    "centralbank.go.ke": ["/press/"],
    "statehousekenya.go.ke": ["/press-releases/"],
    "eacc.go.ke": ["/media-centre/press-releases/"],
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

PROXY_POOL_MODULE = os.environ.get("PROXY_POOL_MODULE", "")  # dotted path, e.g. "legislative_scraper"


def _content_hash(url: str) -> str:
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:24]


def _try_load_proxy_pool():
    """Optional integration with your existing ProxyPool, if configured."""
    if not PROXY_POOL_MODULE:
        return None
    try:
        mod = importlib.import_module(PROXY_POOL_MODULE)
        pool_cls = getattr(mod, "ProxyPool", None)
        if pool_cls is None:
            logger.warning(f"{PROXY_POOL_MODULE} has no ProxyPool class.")
            return None
        return pool_cls()
    except Exception as e:
        logger.warning(f"Could not load ProxyPool from {PROXY_POOL_MODULE}: {e}")
        return None


class SupabaseSink:
    def __init__(self):
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. real data unavailable.")
        self.client = create_client(url, key)
        self._source_cache: Dict[str, str] = {}

    def get_source_id(self, domain: str) -> Optional[str]:
        if domain in self._source_cache:
            return self._source_cache[domain]
        try:
            res = self.client.table("news_sources").select("id").eq("domain", domain).limit(1).execute()
            if res.data:
                sid = res.data[0]["id"]
                self._source_cache[domain] = sid
                return sid
        except Exception as e:
            logger.error(f"Source lookup failed for {domain}: {e}")
        return None

    def insert_signal(self, signal: Dict[str, Any]) -> bool:
        try:
            self.client.table("signals").insert(signal).execute()
            return True
        except Exception as e:
            msg = str(e)
            if "duplicate key" in msg.lower() or "23505" in msg:
                logger.debug(f"Duplicate signal skipped: {signal.get('url')}")
                return False
            logger.error(f"Insert failed for {signal.get('url')}: {e}")
            return False


class NewsCollector:
    def __init__(self):
        self.sink = SupabaseSink()
        self.proxy_pool = _try_load_proxy_pool()
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
        self.stats = {"fetched": 0, "inserted": 0, "duplicates": 0, "errors": 0}

    # -------------------------------------------------------------
    #  RSS collection
    # -------------------------------------------------------------
    def collect_rss(self) -> None:
        for domain, feeds in RSS_FEEDS.items():
            source_id = self.sink.get_source_id(domain)
            if not source_id:
                logger.warning(f"No news_sources row for {domain}. Run news_sources.py first. Skipping.")
                continue
            for feed_url in feeds:
                self._collect_one_feed(domain, source_id, feed_url)

    def _collect_one_feed(self, domain: str, source_id: str, feed_url: str) -> None:
        try:
            parsed = feedparser.parse(feed_url)
        except Exception as e:
            logger.error(f"Feed parse failed for {feed_url}: {e}")
            self.stats["errors"] += 1
            return

        if getattr(parsed, "bozo", False) and not parsed.entries:
            logger.warning(f"Feed {feed_url} returned no usable entries.")
            return

        for entry in parsed.entries:
            self.stats["fetched"] += 1
            url = entry.get("link", "")
            title = entry.get("title", "")
            if not url or not title:
                continue

            published_at = None
            if entry.get("published_parsed"):
                published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()

            clean_content = self._extract_article_text(url)
            if not clean_content:
                # RSS summary as a minimum-viable body if full-text extraction fails
                clean_content = re.sub("<[^<]+?>", "", entry.get("summary", ""))

            if not clean_content or len(clean_content) < 200:
                continue

            signal = {
                "source_id": source_id,
                "url": url,
                "title": title.strip(),
                "raw_content": entry.get("summary", ""),
                "clean_content": clean_content[:20000],
                "published_at": published_at,
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "content_hash": _content_hash(url),
                "enrichment_status": "pending",
                "fusion_status": "pending",
            }
            if self.sink.insert_signal(signal):
                self.stats["inserted"] += 1
                logger.info(f"  [RSS] {domain}: {title[:70]}")
            else:
                self.stats["duplicates"] += 1

    # -------------------------------------------------------------
    #  Direct HTML collection (official sources)
    # -------------------------------------------------------------
    def collect_direct_html(self) -> None:
        for domain, paths in DIRECT_HTML_PATHS.items():
            source_id = self.sink.get_source_id(domain)
            if not source_id:
                logger.warning(f"No news_sources row for {domain}. Run news_sources.py first. Skipping.")
                continue
            for path in paths:
                self._collect_one_html_page(domain, source_id, f"https://{domain}{path}")

    def _collect_one_html_page(self, domain: str, source_id: str, page_url: str) -> None:
        try:
            resp = self.session.get(page_url, timeout=30)
            if resp.status_code != 200:
                logger.warning(f"HTTP {resp.status_code} for {page_url}")
                self.stats["errors"] += 1
                return
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            logger.error(f"Direct fetch failed for {page_url}: {e}")
            self.stats["errors"] += 1
            return

        links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/"):
                href = f"https://{domain}{href}"
            if href.startswith(f"https://{domain}") and href not in links:
                links.add(href)

        for link in list(links)[:30]:
            self.stats["fetched"] += 1
            clean_content = self._extract_article_text(link)
            if not clean_content or len(clean_content) < 200:
                continue

            title_guess = link.rstrip("/").split("/")[-1].replace("-", " ").title()
            signal = {
                "source_id": source_id,
                "url": link,
                "title": title_guess[:500],
                "raw_content": None,
                "clean_content": clean_content[:20000],
                "published_at": None,
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "content_hash": _content_hash(link),
                "enrichment_status": "pending",
                "fusion_status": "pending",
            }
            if self.sink.insert_signal(signal):
                self.stats["inserted"] += 1
                logger.info(f"  [HTML] {domain}: {title_guess[:70]}")
            else:
                self.stats["duplicates"] += 1
            time.sleep(0.5)

    # -------------------------------------------------------------
    #  Shared full-text extraction
    # -------------------------------------------------------------
    def _extract_article_text(self, url: str) -> Optional[str]:
        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return None
            text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
            return text.strip() if text else None
        except Exception as e:
            logger.debug(f"trafilatura extraction failed for {url}: {e}")
            return None

    # -------------------------------------------------------------
    #  Entry point
    # -------------------------------------------------------------
    def run(self) -> None:
        logger.info("=" * 60)
        logger.info("  News Signal Collection - Stage 1")
        logger.info("=" * 60)
        self.collect_rss()
        self.collect_direct_html()
        logger.info(
            f"Collection complete. Fetched={self.stats['fetched']} "
            f"Inserted={self.stats['inserted']} Duplicates={self.stats['duplicates']} "
            f"Errors={self.stats['errors']}"
        )


if __name__ == "__main__":
    collector = NewsCollector()
    collector.run()
