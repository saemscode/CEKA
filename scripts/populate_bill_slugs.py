#!/usr/bin/env python3
"""
CEKA Bill Slug Population Script
=================================
Generates and populates URL slugs for every bill in the public.bills table.

Slug Construction Hierarchy:
  Level 1 — base slug:    {sanitized-title}-{year}
  Level 2 — stage suffix: {base-slug}-{bill-stage}   (only on collision)
  Level 3 — NA identifier: {base-slug}-na-{seq:02d}  (collision after stage)

Year Resolution Priority:
  1. bill.date field (ISO 8601)
  2. bill.created_at field
  3. current year fallback

Usage:
  pip install supabase python-dotenv
  python scripts/populate_bill_slugs.py

  Or with explicit credentials:
  SUPABASE_URL=... SUPABASE_ANON_KEY=... python scripts/populate_bill_slugs.py
"""

import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: 'supabase' package not installed. Run: pip install supabase")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # Try multiple candidate paths so the script works regardless of CWD
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    _candidates = [
        os.path.join(_script_dir, '..', '.env'),           # CEKA/.env (from scripts/)
        os.path.join(_script_dir, '..', '.env.local'),     # CEKA/.env.local
        os.path.join(os.getcwd(), 'CEKA', '.env'),         # if run from ceka v010/
        os.path.join(os.getcwd(), '.env'),                  # if run from CEKA/
    ]
    for _candidate in _candidates:
        _resolved = os.path.normpath(_candidate)
        if os.path.isfile(_resolved):
            load_dotenv(dotenv_path=_resolved, override=True)
            print(f"[env] Loaded: {_resolved}")
            break
    else:
        print("[env] WARNING: No .env file found in any candidate path.")
except ImportError:
    pass  # python-dotenv optional — credentials can be set directly in environment

# ── Credentials ────────────────────────────────────────────────────────────────
SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
)
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or os.environ.get("VITE_SUPABASE_ANON_KEY")
)

# ── Hard Project Guard ────────────────────────────────────────────────────────
# The only valid CEKA project is cajrvemigxghnfmyopiy.
# Refuse execution against any other project ID to prevent accidental writes.
REQUIRED_PROJECT_ID = "cajrvemigxghnfmyopiy"

if SUPABASE_URL and REQUIRED_PROJECT_ID not in SUPABASE_URL:
    print(f"\n{'='*60}")
    print(f" ABORT: Wrong Supabase project!")
    print(f" Resolved URL : {SUPABASE_URL}")
    print(f" Required ID  : {REQUIRED_PROJECT_ID}")
    print(f" Fix: ensure SUPABASE_URL or VITE_SUPABASE_URL in your")
    print(f"      .env points to cajrvemigxghnfmyopiy.supabase.co")
    print(f"{'='*60}\n")
    sys.exit(1)

if not SUPABASE_URL or not SUPABASE_KEY:
    print(
        "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
        "in your environment or CEKA/.env file."
    )
    sys.exit(1)


# ── Configuration ──────────────────────────────────────────────────────────────
# Words to strip from a bill title when building the slug.
# These add length but zero SEO value.
STOPWORDS = {"the", "a", "an", "of", "for", "in", "on", "to", "and", "or", "is", "be"}

# Maximum slug segment length (characters) before truncation
MAX_TITLE_SEGMENT_LENGTH = 80

# Map known status/stage values to their short slug suffixes
STAGE_SUFFIX_MAP = {
    "First Reading":        "first-reading",
    "Second Reading":       "second-reading",
    "Committee Stage":      "committee",
    "Third Reading":        "third-reading",
    "Presidential Assent":  "assented",
    "Enacted":              "enacted",
    "Withdrawn":            "withdrawn",
    "Rejected":             "rejected",
    "Lapsed":               "lapsed",
    "Petitioned":           "petitioned",
}


# ── Slug Generation Logic ──────────────────────────────────────────────────────

def extract_year(bill: dict) -> str:
    """Extract the most authoritative year from the bill record."""
    for field in ("date", "created_at", "updated_at"):
        raw = bill.get(field)
        if raw:
            try:
                return str(datetime.fromisoformat(raw.replace("Z", "+00:00")).year)
            except (ValueError, AttributeError):
                pass
    return str(datetime.now(tz=timezone.utc).year)


def sanitize(text: str) -> str:
    """Convert a bill title to a lowercase, hyphen-separated, URL-safe string."""
    # Lowercase
    text = text.lower()
    # Remove content inside parentheses (bill numbers, amendment labels, etc.)
    # but keep the word "amendment" if it appears outside parens
    text = re.sub(r"\(no\.?\s*\d+\)", "", text)
    text = re.sub(r"\(\s*amendment\s*\)", " amendment", text)
    text = re.sub(r"\([^)]*\)", "", text)
    # Replace non-alphanumeric with space
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    # Collapse whitespace to single hyphen
    text = re.sub(r"[\s-]+", "-", text.strip())
    # Trim leading/trailing hyphens
    text = text.strip("-")
    return text[:MAX_TITLE_SEGMENT_LENGTH].rstrip("-")


def build_base_slug(bill: dict) -> str:
    """Build the Level-1 base slug: {sanitized-title}-{year}."""
    title = bill.get("title") or "bill"
    year = extract_year(bill)
    base = sanitize(title)
    return f"{base}-{year}"


def build_stage_slug(bill: dict) -> Optional[str]:
    """Build the Level-2 slug suffix from the bill's legislative stage/status."""
    status = bill.get("status") or ""
    suffix = STAGE_SUFFIX_MAP.get(status)
    if not suffix:
        # Try to derive from a partial match
        for key, val in STAGE_SUFFIX_MAP.items():
            if key.lower() in status.lower():
                suffix = val
                break
    return suffix


# ── Main Population Logic ──────────────────────────────────────────────────────

def main():
    print(f"\n{'='*60}")
    print(" CEKA Bill Slug Population Script")
    print(f" Target: {SUPABASE_URL}")
    print(f"{'='*60}\n")

    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch all bills (id, title, status, date, created_at are sufficient)
    print("Fetching all bills from public.bills...")
    result = client.table("bills").select(
        "id, title, status, date, created_at, updated_at, slug"
    ).execute()

    bills = result.data or []
    total = len(bills)
    print(f"Found {total} bills.\n")

    if total == 0:
        print("No bills found. Exiting.")
        return

    # Track slugs we have already assigned in THIS run to catch within-run collisions
    assigned_slugs: dict[str, str] = {}  # slug → bill_id

    # Track bills already slugged in the DB (pre-existing slugs are preserved)
    for b in bills:
        if b.get("slug"):
            assigned_slugs[b["slug"]] = b["id"]

    updates = 0
    skipped = 0
    errors = 0

    for bill in bills:
        bill_id = bill["id"]
        existing_slug = bill.get("slug")

        # Skip bills that already have a slug
        if existing_slug:
            print(f"  [SKIP]   {bill_id[:8]}... already has slug: {existing_slug}")
            skipped += 1
            continue

        # ── Level 1: base slug ──
        candidate = build_base_slug(bill)

        # ── Level 2: stage suffix on collision ──
        if candidate in assigned_slugs and assigned_slugs[candidate] != bill_id:
            stage_suffix = build_stage_slug(bill)
            if stage_suffix:
                candidate = f"{candidate}-{stage_suffix}"

        # ── Level 3: NA sequential identifier on continued collision ──
        if candidate in assigned_slugs and assigned_slugs[candidate] != bill_id:
            seq = 1
            base_candidate = candidate
            while f"{base_candidate}-na-{seq:02d}" in assigned_slugs:
                seq += 1
            candidate = f"{base_candidate}-na-{seq:02d}"

        # Persist
        try:
            client.table("bills").update({"slug": candidate}).eq("id", bill_id).execute()
            assigned_slugs[candidate] = bill_id
            updates += 1
            title_preview = (bill.get("title") or "")[:55]
            print(f"  [SET]    {bill_id[:8]}... → {candidate}")
            print(f"           Title: {title_preview}")
        except Exception as exc:
            errors += 1
            print(f"  [ERROR]  {bill_id[:8]}... failed: {exc}")

    print(f"\n{'='*60}")
    print(f" Done. Updated: {updates} | Skipped: {skipped} | Errors: {errors}")
    print(f"{'='*60}\n")

    if errors > 0:
        print("Review errors above. Common causes:")
        print("  - Slice of DB table exhausted (RLS policy blocking service key)")
        print("  - Unique constraint violation (run with service key, not anon key)")
        sys.exit(1)


if __name__ == "__main__":
    main()
