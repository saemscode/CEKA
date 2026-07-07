"""
deep_intelligence_relay.py — CEKA Deep Intelligence Relay Engine
=================================================================
Phase 2 deep analysis that runs AFTER reprocess_all_bills.py.
All original pipeline code is untouched. This script only reads and
writes the four new columns added by apply_schema_deep_intel.py:
  - deep_analysis_status   ('pending' | 'in_progress' | 'completed' | 'failed')
  - deep_analysis_cursor   (character offset into text_content)
  - deep_working_memory    (accumulated JSON findings across all LLM runs)
  - deep_insights          (final committed findings when cursor = end of text)
  - deep_analysed_at       (timestamp of completion)

Architecture:
  - All wide-context LLMs are instantiated and on standby simultaneously.
  - A shared state object (deep_working_memory + deep_analysis_cursor) in
    Supabase acts as the relay baton. Any LLM can pick up from the exact
    character position the previous one reached.
  - Failure modes handled: token exhaustion, server timeout, rate limit,
    API error. On any failure the cursor and memory are committed before exit
    so the next available LLM resumes from the exact last committed point.
  - Fully automated. No HITL. Runs to completion regardless of individual
    provider outages.

Run:
    python scripts/deep_intelligence_relay.py
    python scripts/deep_intelligence_relay.py <bill_id> [<bill_id> ...]
"""

import os
import sys
import json
import logging
import time
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    _env = Path(__file__).resolve().parent.parent / ".env"
    if _env.exists():
        load_dotenv(dotenv_path=str(_env), override=True)
except ImportError:
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase_direct import SupabaseDirect  # type: ignore

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [DEEP-RELAY] - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("deep_intelligence_relay.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Chunk size per LLM call — stays within safe token budgets for every
# provider while maximising coverage. Each provider may override this.
# ---------------------------------------------------------------------------
DEFAULT_CHUNK_CHARS = 80_000   # ~20k tokens — safe for 128k+ context models
GEMINI_CHUNK_CHARS  = 500_000  # Gemini 2.0 Flash: 2M token window
MIN_CHUNK_CHARS     = 8_000    # Minimum viable chunk for small fallbacks

# ---------------------------------------------------------------------------
# System prompt — governs every LLM in the relay identically
# ---------------------------------------------------------------------------
RELAY_SYSTEM_PROMPT = (
    "You are a non-partisan Kenyan legislative deep-analysis engine operating for CEKA "
    "(Civic Education Kenya). You are one node in an automated relay. Other language models "
    "may have already processed earlier sections of this document and their findings are "
    "provided to you as PREVIOUS WORKING MEMORY. "
    "Your only job: read the CURRENT CHUNK, extend the working memory with new findings, "
    "and return the updated working memory as a single raw JSON object. "
    "Do NOT repeat findings already present. DO add, deepen, or contradict them if this chunk "
    "provides new evidence. "
    "You MUST return ONLY a raw JSON object with exactly these two keys:\n"
    "  \"stalemate_breakdown\": (string) Comprehensive political friction analysis.\n"
    "  \"hidden_contentious_clauses\": (list of strings) Clause references with public impact.\n"
    "No markdown. No preamble. No commentary. Start with { and end with }."
)


def _build_relay_prompt(
    bill_title: str,
    chunk_text: str,
    working_memory: Dict[str, Any],
    cursor_start: int,
    cursor_end: int,
    total_length: int,
) -> str:
    memory_str = json.dumps(working_memory, indent=2, ensure_ascii=False) if working_memory else "{}"
    pct = int((cursor_end / total_length) * 100) if total_length > 0 else 0
    return (
        f"BILL TITLE: {bill_title}\n"
        f"DOCUMENT SECTION: characters {cursor_start}–{cursor_end} of {total_length} "
        f"({pct}% through the document)\n\n"
        f"PREVIOUS WORKING MEMORY (findings from earlier sections of this document):\n"
        f"{memory_str}\n\n"
        f"CURRENT TEXT CHUNK TO ANALYZE:\n{chunk_text}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Read the CURRENT TEXT CHUNK in full.\n"
        f"2. Identify any new contentious clauses, hidden financial implications, "
        f"or explicit evidence of political stalemate.\n"
        f"3. Merge new findings into PREVIOUS WORKING MEMORY. Do not repeat confirmed findings.\n"
        f"4. Deepen or contradict existing findings only when this chunk provides clear evidence.\n"
        f"5. Return ONLY the updated JSON object. No markdown fences. No preamble."
    )


# ---------------------------------------------------------------------------
# Wide-Context LLM Provider Registry
# Each entry: (name, chunk_chars, call_fn)
# Ordered by context window size descending. The relay tries them in order.
# If a provider fails mid-chunk, the cursor stays at the last commit point
# and the next provider in the list picks up from there.
# ---------------------------------------------------------------------------

def _call_gemini(prompt: str) -> Optional[str]:
    """Gemini 2.0 Flash — 2M token context window."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=RELAY_SYSTEM_PROMPT,
        )
        resp = model.generate_content(prompt)
        return resp.text if resp and resp.text else None
    except Exception as e:
        logger.warning(f"[Gemini] {e}")
        return None


def _call_claude(prompt: str) -> Optional[str]:
    """Claude 3.5 Sonnet — 200k token context, best legal reasoning."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4096,
            system=RELAY_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        for block in (resp.content or []):
            text = getattr(block, "text", None)
            if text and isinstance(text, str) and text.strip():
                return text
        return None
    except Exception as e:
        logger.warning(f"[Claude] {e}")
        return None


def _call_openai(prompt: str) -> Optional[str]:
    """GPT-4o — 128k tokens, strict JSON output enforcement."""
    api_key = os.getenv("OPENAI_API_KEY_1") or os.getenv("OPENAI_API_KEY_2")
    if not api_key:
        return None
    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": RELAY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning(f"[GPT-4o] {e}")
        return None


def _call_cohere(prompt: str) -> Optional[str]:
    """Cohere Command-R-Plus — 128k tokens, strong document grounding."""
    api_key = os.getenv("COHERE_API_KEY")
    if not api_key:
        return None
    try:
        import requests as req
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "model": "command-r-plus",
            "preamble": RELAY_SYSTEM_PROMPT,
            "message": prompt,
            "max_tokens": 4096,
            "temperature": 0.1,
        }
        r = req.post("https://api.cohere.com/v1/chat", headers=headers, json=payload, timeout=90)
        if r.status_code == 200:
            data = r.json()
            return data.get("text") or data.get("message", {}).get("content", [{}])[0].get("text")
        logger.warning(f"[Cohere] HTTP {r.status_code}: {r.text[:200]}")
        return None
    except Exception as e:
        logger.warning(f"[Cohere] {e}")
        return None


def _call_openrouter_llama(prompt: str) -> Optional[str]:
    """Llama 3.3 70B via OpenRouter — 128k tokens, open-source fallback."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None
    try:
        import requests as req
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ceka.co.ke",
            "X-Title": "CEKA Deep Legislative Analysis",
        }
        models = [
            "meta-llama/llama-3.3-70b-instruct",
            "google/gemini-2.0-flash-001",
            "mistralai/mistral-large",
            "deepseek/deepseek-chat-v3-0324:free",
        ]
        for model in models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": RELAY_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 4096,
            }
            r = req.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=90,
            )
            if r.status_code == 200:
                content = r.json().get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    logger.info(f"[OpenRouter] success via {model}")
                    return content
            elif r.status_code == 429:
                logger.warning(f"[OpenRouter] rate limit on {model}")
                time.sleep(2)
        return None
    except Exception as e:
        logger.warning(f"[OpenRouter] {e}")
        return None


def _call_deepseek(prompt: str) -> Optional[str]:
    """DeepSeek-V3 — 128k tokens, cost-effective, logical."""
    api_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_API_KEY_SECONDARY")
    if not api_key:
        return None
    try:
        import requests as req
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": RELAY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }
        r = req.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=90,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"]
        logger.warning(f"[DeepSeek] HTTP {r.status_code}: {r.text[:200]}")
        return None
    except Exception as e:
        logger.warning(f"[DeepSeek] {e}")
        return None


def _call_groq_large(prompt: str) -> Optional[str]:
    """Groq Llama 3.3 70B — fast inference, 128k window."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        # Groq TPM cap: truncate to 100k chars to stay within burst limits
        safe_prompt = prompt[:100_000]
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RELAY_SYSTEM_PROMPT},
                {"role": "user", "content": safe_prompt},
            ],
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning(f"[Groq] {e}")
        return None


# ---------------------------------------------------------------------------
# Provider registry — ordered by context window size (largest first).
# Each tuple: (display_name, chunk_chars, call_function)
# The relay engine iterates this list. If provider N fails, provider N+1
# picks up from the last committed cursor position automatically.
# ---------------------------------------------------------------------------
WIDE_CONTEXT_PROVIDERS: List[Tuple[str, int, Any]] = [
    ("Gemini-2.0-Flash",       GEMINI_CHUNK_CHARS,  _call_gemini),
    ("Claude-3.5-Sonnet",      120_000,             _call_claude),
    ("GPT-4o",                 100_000,             _call_openai),
    ("Cohere-Command-R-Plus",  100_000,             _call_cohere),
    ("OpenRouter-Llama",        80_000,             _call_openrouter_llama),
    ("DeepSeek-V3",             80_000,             _call_deepseek),
    ("Groq-Llama-70B",          80_000,             _call_groq_large),
]


# ---------------------------------------------------------------------------
# JSON extraction — handles markdown fences and leading/trailing noise
# ---------------------------------------------------------------------------
def _extract_json(raw: str) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    text = raw.strip()
    # Strip markdown fences
    if "```" in text:
        match = re.search(r"```(?:json)?\n?(.*?)\n?```", text, re.DOTALL | re.I)
        if match:
            text = match.group(1).strip()
        else:
            text = text.replace("```json", "").replace("```", "").strip()
    # Find the outermost JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    candidate = text[start : end + 1]
    # Trailing comma cleanup
    candidate = re.sub(r",\s*([\]}])", r"\1", candidate)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Merge two working memory dicts additively
# ---------------------------------------------------------------------------
def _merge_memory(
    existing: Dict[str, Any], incoming: Dict[str, Any]
) -> Dict[str, Any]:
    merged = dict(existing)

    # Merge stalemate_breakdown — append if incoming has new content
    old_sb = existing.get("stalemate_breakdown", "")
    new_sb = incoming.get("stalemate_breakdown", "")
    if new_sb and new_sb.strip() and new_sb.strip() not in old_sb:
        merged["stalemate_breakdown"] = (
            (old_sb.rstrip() + " " + new_sb.strip()) if old_sb else new_sb.strip()
        )
    else:
        merged["stalemate_breakdown"] = old_sb

    # Merge hidden_contentious_clauses — deduplicate by normalised string
    existing_clauses: List[str] = existing.get("hidden_contentious_clauses", [])
    incoming_clauses: List[str] = incoming.get("hidden_contentious_clauses", [])
    seen = {c.lower().strip() for c in existing_clauses}
    for clause in incoming_clauses:
        if clause and clause.lower().strip() not in seen:
            existing_clauses.append(clause)
            seen.add(clause.lower().strip())
    merged["hidden_contentious_clauses"] = existing_clauses

    return merged


# ---------------------------------------------------------------------------
# Core relay engine
# ---------------------------------------------------------------------------
class DeepIntelligenceRelay:
    def __init__(self):
        self.db = SupabaseDirect()
        logger.info("✅ SupabaseDirect connected.")

    # ------------------------------------------------------------------
    def _fetch_pending_bills(self, bill_ids: Optional[List[str]] = None) -> List[Dict]:
        if bill_ids:
            results = []
            for bid in bill_ids:
                rows = self.db.select(
                    "bills",
                    "id,title,text_content,deep_analysis_status,"
                    "deep_analysis_cursor,deep_working_memory",
                    eq="id",
                    eq_val=bid,
                )
                if rows:
                    results.extend(rows)
            return results

        # Poll for bills where Phase 1 is done and deep analysis is pending
        # SupabaseDirect.select supports a single eq filter. We retrieve all
        # pending bills by filtering on deep_analysis_status.
        try:
            rows = self.db.select(
                "bills",
                "id,title,text_content,deep_analysis_status,"
                "deep_analysis_cursor,deep_working_memory",
                eq="deep_analysis_status",
                eq_val="pending",
            )
            # Only process bills that have real extracted text (Phase 1 must
            # have stored text_content before deep analysis makes sense)
            return [r for r in (rows or []) if r.get("text_content") and len(r["text_content"]) >= 500]
        except Exception as e:
            logger.error(f"Failed to fetch pending bills: {e}")
            return []

    # ------------------------------------------------------------------
    def _commit_state(
        self,
        bill_id: str,
        cursor: int,
        memory: Dict[str, Any],
        status: str = "in_progress",
        final_insights: Optional[Dict] = None,
    ):
        update = {
            "deep_analysis_cursor": cursor,
            "deep_working_memory": json.dumps(memory),
            "deep_analysis_status": status,
        }
        if final_insights is not None:
            update["deep_insights"] = json.dumps(final_insights)
            update["deep_analysed_at"] = datetime.now(timezone.utc).isoformat()
        try:
            self.db.update("bills", update, eq="id", eq_val=bill_id)
        except Exception as e:
            logger.error(f"  ❌ State commit failed for {bill_id}: {e}")

    # ------------------------------------------------------------------
    def _process_chunk(
        self,
        bill_title: str,
        chunk_text: str,
        working_memory: Dict[str, Any],
        cursor_start: int,
        cursor_end: int,
        total_length: int,
        preferred_chunk_chars: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Try each wide-context provider in order until one succeeds.
        Returns the updated (merged) working memory, or None if all fail.
        """
        prompt = _build_relay_prompt(
            bill_title, chunk_text, working_memory,
            cursor_start, cursor_end, total_length,
        )

        for provider_name, provider_chunk_chars, call_fn in WIDE_CONTEXT_PROVIDERS:
            logger.info(f"    → Attempting chunk via {provider_name}...")
            try:
                raw = call_fn(prompt)
                if not raw or not raw.strip():
                    logger.warning(f"    {provider_name} returned empty.")
                    continue
                parsed = _extract_json(raw)
                if parsed is None:
                    logger.warning(f"    {provider_name} returned unparseable output.")
                    continue
                # Validate required keys
                if "stalemate_breakdown" not in parsed and "hidden_contentious_clauses" not in parsed:
                    logger.warning(f"    {provider_name} missing required keys.")
                    continue
                merged = _merge_memory(working_memory, parsed)
                logger.info(f"    ✅ {provider_name} succeeded.")
                return merged
            except Exception as e:
                logger.warning(f"    {provider_name} raised exception: {e}")
                continue

        return None

    # ------------------------------------------------------------------
    def process_bill(self, bill: Dict) -> bool:
        bill_id    = bill["id"]
        title      = bill.get("title", "Untitled")
        text       = bill.get("text_content", "") or ""
        cursor     = int(bill.get("deep_analysis_cursor") or 0)
        raw_memory = bill.get("deep_working_memory") or {}

        if isinstance(raw_memory, str):
            try:
                raw_memory = json.loads(raw_memory)
            except Exception:
                raw_memory = {}

        working_memory: Dict[str, Any] = raw_memory
        total_length = len(text)

        if total_length < 500:
            logger.info(f"  Skipping {title} — text too short ({total_length} chars).")
            self._commit_state(bill_id, 0, {}, status="failed")
            return False

        logger.info("-" * 70)
        logger.info(f"  DEEP ANALYSIS: {title} ({bill_id})")
        logger.info(f"  Total text: {total_length:,} chars | Resume cursor: {cursor:,}")

        # Mark as in_progress immediately so concurrent runs skip this bill
        self._commit_state(bill_id, cursor, working_memory, status="in_progress")

        chunk_errors = 0
        MAX_CONSECUTIVE_ERRORS = 3

        while cursor < total_length:
            # Determine chunk size — use Gemini's large window first, then
            # fall back to DEFAULT_CHUNK_CHARS for subsequent chunks if the
            # bill is being resumed mid-way through.
            chunk_size = GEMINI_CHUNK_CHARS if cursor == 0 else DEFAULT_CHUNK_CHARS
            chunk_end = min(cursor + chunk_size, total_length)
            chunk_text = text[cursor:chunk_end]

            pct = int((chunk_end / total_length) * 100)
            logger.info(
                f"  Chunk [{cursor:,}→{chunk_end:,}] ({pct}% of doc) | "
                f"Memory: {len(working_memory.get('hidden_contentious_clauses', []))} clauses found"
            )

            updated_memory = self._process_chunk(
                bill_title=title,
                chunk_text=chunk_text,
                working_memory=working_memory,
                cursor_start=cursor,
                cursor_end=chunk_end,
                total_length=total_length,
                preferred_chunk_chars=chunk_size,
            )

            if updated_memory is None:
                chunk_errors += 1
                logger.error(
                    f"  ❌ ALL providers failed on chunk [{cursor}→{chunk_end}]. "
                    f"Error #{chunk_errors}/{MAX_CONSECUTIVE_ERRORS}."
                )
                if chunk_errors >= MAX_CONSECUTIVE_ERRORS:
                    logger.error("  ❌ Too many consecutive failures. Halting this bill.")
                    self._commit_state(bill_id, cursor, working_memory, status="failed")
                    return False
                # Back off and retry this same chunk after a delay
                time.sleep(10)
                continue

            chunk_errors = 0
            working_memory = updated_memory
            cursor = chunk_end

            # Commit state after every successful chunk — crash-safe
            is_complete = cursor >= total_length
            self._commit_state(
                bill_id,
                cursor,
                working_memory,
                status="completed" if is_complete else "in_progress",
                final_insights=working_memory if is_complete else None,
            )

            if not is_complete:
                # Brief pause between chunks to respect rate limits
                time.sleep(2)

        logger.info(
            f"  ✅ DEEP ANALYSIS COMPLETE: {title}\n"
            f"     Clauses found: {len(working_memory.get('hidden_contentious_clauses', []))}\n"
            f"     Stalemate chars: {len(working_memory.get('stalemate_breakdown', ''))}"
        )
        return True

    # ------------------------------------------------------------------
    def run(self, bill_ids: Optional[List[str]] = None):
        bills = self._fetch_pending_bills(bill_ids)
        total = len(bills)

        if total == 0:
            logger.info("No bills pending deep analysis.")
            return

        logger.info(f"🚀 Starting deep analysis on {total} bill(s)...")
        ok, err = 0, 0

        for i, bill in enumerate(bills):
            try:
                success = self.process_bill(bill)
                if success:
                    ok += 1
                else:
                    err += 1
            except Exception as e:
                logger.error(f"❌ Unhandled error on '{bill.get('title')}': {e}")
                err += 1

            if (i + 1) % 5 == 0 or (i + 1) == total:
                logger.info(f"📊 Progress: {i+1}/{total} | OK={ok} ERR={err}")

            # Pause between bills to respect API rate limits across providers
            if i < total - 1:
                time.sleep(3)

        logger.info("🏁 DEEP ANALYSIS RUN COMPLETE.")
        logger.info(f"    Total: {total} | Success: {ok} | Failed: {err}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    target_ids = sys.argv[1:] if len(sys.argv) > 1 else None
    relay = DeepIntelligenceRelay()
    relay.run(target_ids)
