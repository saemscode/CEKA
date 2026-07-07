"""
apply_schema_deep_intel.py — CEKA Deep Intelligence Relay Schema Migration
===========================================================================
Adds the four columns required by the Deep Intelligence Relay engine to the
`bills` table in the active Supabase instance.

Run ONCE before running deep_intelligence_relay.py for the first time:
    python scripts/apply_schema_deep_intel.py

Uses SupabaseDirect (Service Role Key) to execute raw SQL via the
Supabase REST /rpc endpoint (pg_execute_sql is NOT available on free tier,
so this script uses the PostgREST rpc approach via the management API or
falls back to direct SQL if the Supabase management URL is set).

Columns added:
  - deep_analysis_status  text         DEFAULT 'pending'
  - deep_analysis_cursor  integer      DEFAULT 0
  - deep_working_memory   jsonb        DEFAULT '{}'::jsonb
  - deep_insights         jsonb        DEFAULT NULL
  - deep_analysed_at      timestamptz  DEFAULT NULL
"""

import os
import sys
import json
import logging
import requests
from pathlib import Path

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("apply_schema_deep_intel.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# The five ALTER TABLE statements — idempotent (IF NOT EXISTS guards)
# ---------------------------------------------------------------------------
MIGRATIONS = [
    """
    ALTER TABLE public.bills
    ADD COLUMN IF NOT EXISTS deep_analysis_status text
        NOT NULL DEFAULT 'pending';
    """,
    """
    ALTER TABLE public.bills
    ADD COLUMN IF NOT EXISTS deep_analysis_cursor integer
        NOT NULL DEFAULT 0;
    """,
    """
    ALTER TABLE public.bills
    ADD COLUMN IF NOT EXISTS deep_working_memory jsonb
        NOT NULL DEFAULT '{}'::jsonb;
    """,
    """
    ALTER TABLE public.bills
    ADD COLUMN IF NOT EXISTS deep_insights jsonb
        DEFAULT NULL;
    """,
    """
    ALTER TABLE public.bills
    ADD COLUMN IF NOT EXISTS deep_analysed_at timestamptz
        DEFAULT NULL;
    """,
    # Index for efficient polling of pending bills
    """
    CREATE INDEX IF NOT EXISTS idx_bills_deep_analysis_status
    ON public.bills (deep_analysis_status);
    """,
]


def run_migrations():
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        logger.error("FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env")
        sys.exit(1)

    # Supabase exposes a SQL execution endpoint for service-role authenticated
    # requests at POST /rest/v1/rpc/<function_name>. Since we need raw DDL
    # we use the Management API SQL endpoint if available, otherwise we print
    # instructions and write a .sql file for manual execution.
    management_url = os.getenv("SUPABASE_DB_URL", "")  # postgres:// direct if set

    if management_url:
        # Direct psql approach via subprocess
        import subprocess
        combined_sql = "\n".join(MIGRATIONS)
        try:
            result = subprocess.run(
                ["psql", management_url, "-c", combined_sql],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                logger.info("✅ Schema migration applied successfully via psql.")
                logger.info(result.stdout)
            else:
                logger.error(f"❌ psql error: {result.stderr}")
                sys.exit(1)
        except FileNotFoundError:
            logger.warning("psql not found in PATH. Falling back to SQL file output.")
            _write_sql_file()
    else:
        # Attempt via Supabase Management API SQL endpoint
        # POST https://api.supabase.com/v1/projects/{ref}/database/query
        project_ref = _extract_project_ref(supabase_url)
        mgmt_key = os.getenv("SUPABASE_MANAGEMENT_API_KEY", "")

        if project_ref and mgmt_key:
            combined_sql = "\n".join(MIGRATIONS)
            headers = {
                "Authorization": f"Bearer {mgmt_key}",
                "Content-Type": "application/json",
            }
            payload = {"query": combined_sql}
            endpoint = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
            try:
                r = requests.post(endpoint, headers=headers, json=payload, timeout=60)
                if r.status_code in (200, 201):
                    logger.info("✅ Schema migration applied successfully via Supabase Management API.")
                    logger.info(f"   Response: {r.text[:200]}")
                else:
                    logger.warning(f"Management API returned {r.status_code}: {r.text[:300]}")
                    logger.warning("Falling back to SQL file output for manual execution.")
                    _write_sql_file()
            except Exception as e:
                logger.warning(f"Management API call failed: {e}. Writing SQL file.")
                _write_sql_file()
        else:
            logger.warning(
                "Neither SUPABASE_DB_URL nor SUPABASE_MANAGEMENT_API_KEY is set. "
                "Writing migration SQL to file for manual execution."
            )
            _write_sql_file()


def _extract_project_ref(supabase_url: str) -> str:
    """Extract the project ref from https://<ref>.supabase.co"""
    try:
        host = supabase_url.replace("https://", "").replace("http://", "")
        return host.split(".")[0]
    except Exception:
        return ""


def _write_sql_file():
    """Write migration SQL to a file for manual execution in Supabase SQL Editor."""
    sql_path = Path(__file__).resolve().parent / "deep_intel_schema.sql"
    combined = "\n".join(MIGRATIONS)
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("-- CEKA Deep Intelligence Relay Schema Migration\n")
        f.write("-- Run this in your Supabase SQL Editor:\n\n")
        f.write(combined)
    logger.info(f"📄 SQL migration file written to: {sql_path}")
    logger.info("   Paste its contents into Supabase → SQL Editor → Run.")


if __name__ == "__main__":
    run_migrations()
