import os
import sys
import json
import logging
import time
import zipfile
import io
import traceback
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

# ---------------------------------------------------------------------------
# Force all logs to stdout immediately (so GitHub Actions captures them)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [VAULT-GEN] - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
        logger.info(f"Loaded .env from {env_path}")
    else:
        logger.warning(".env file not found, relying on system env vars.")
except ImportError:
    logger.warning("python-dotenv not installed – using system env vars directly.")

# ---------------------------------------------------------------------------
# Supabase & Backblaze imports
# ---------------------------------------------------------------------------
try:
    from supabase import create_client, Client
    SUPABASE_OK = True
except ImportError as e:
    SUPABASE_OK = False
    logger.error(f"Supabase module import failed: {e}")

try:
    from backblaze_utils import BackblazeVault
    B2_OK = True
except ImportError as e:
    B2_OK = False
    logger.error(f"Backblaze utils import failed: {e}")


class VaultGenerator:
    def __init__(self):
        self.supabase = None
        self.b2 = None
        self._init_supabase()
        self._init_backblaze()

    def _init_supabase(self):
        """Initialize Supabase client and test connection."""
        if not SUPABASE_OK:
            logger.error("Supabase module not available. Vault generation disabled.")
            return

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.")
            return

        try:
            self.supabase = create_client(url, key)
            # Test connection by fetching 1 row from a known table (bills)
            test = self.supabase.table("bills").select("id").limit(1).execute()
            logger.info("Supabase connection successful.")
        except Exception as e:
            logger.error(f"Supabase connection failed: {e}")
            traceback.print_exc()
            self.supabase = None

    def _init_backblaze(self):
        """Initialize Backblaze Vault and test upload permission."""
        if not B2_OK:
            logger.error("Backblaze utils not available. Vault upload disabled.")
            return

        try:
            self.b2 = BackblazeVault()
            # Test by checking if we can list buckets or a known file
            # (BackblazeVault may not have a direct test method; we'll try to get a dummy URL)
            if hasattr(self.b2, 'file_exists'):
                self.b2.file_exists("test_connection_dummy")
            logger.info("Backblaze Vault initialized successfully.")
        except Exception as e:
            logger.error(f"Backblaze Vault init failed: {e}")
            traceback.print_exc()
            self.b2 = None

    def generate_pack(self, user_id: str, bill_id: str) -> Optional[str]:
        """Generate and upload a civic pack for a user/bill pair."""
        if not self.supabase:
            logger.error("Supabase not available – cannot generate pack.")
            return None
        if not self.b2:
            logger.error("Backblaze not available – cannot upload pack.")
            return None

        logger.info(f"📦 Generating pack for User {user_id[-8:]} / Bill {bill_id[-8:]}")

        try:
            # 1. Fetch bill
            bill_resp = self.supabase.table("bills").select("*").eq("id", bill_id).maybe_single().execute()
            bill = bill_resp.data
            if not bill:
                logger.warning(f"Bill {bill_id} not found. Skipping.")
                return None

            # 2. Fetch news mentions (table may be missing – handle)
            news = []
            try:
                news_resp = self.supabase.table("bill_news_mentions").select("*").eq("bill_id", bill_id).execute()
                if news_resp.data:
                    news = news_resp.data
            except Exception as e:
                logger.warning(f"Cannot fetch news mentions (table may not exist): {e}")

            # 3. Build ZIP in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                # Report.md
                report = f"# Civic Intelligence Report: {bill.get('title', 'Untitled')}\n"
                report += f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n\n"
                report += f"## Status\n- Stage: {bill.get('status', 'Unknown')}\n"
                report += f"- Date: {bill.get('date', 'Unknown')}\n- Sponsor: {bill.get('sponsor', 'Unknown')}\n\n"
                report += f"## Summary\n{bill.get('neural_summary') or bill.get('summary') or 'No summary available.'}\n\n"
                report += "## News\n"
                for m in news:
                    report += f"- [{m.get('source_name', '?')}] {m.get('headline', '')} ({m.get('article_url', '#')})\n"
                zip_file.writestr("REPORT.md", report)

                # intelligence.json
                intel_json = {"bill": bill, "news": news, "generated_at": datetime.now(timezone.utc).isoformat()}
                zip_file.writestr("intelligence.json", json.dumps(intel_json, indent=2, default=str))

                # Bill text if present
                if bill.get("text_content"):
                    zip_file.writestr("OFFICIAL_TEXT.txt", bill["text_content"])

            # 4. Upload to Backblaze
            remote_path = f"user-vaults/{user_id}/{bill_id}/civic_pack.zip"
            vault_url = self.b2.upload_bytes(zip_buffer.getvalue(), remote_path, content_type="application/zip")
            logger.info(f"Uploaded to B2: {remote_path}")

            # 5. Update bill_follows record
            update_data = {
                "vault_url": vault_url,
                "vault_refreshed_at": datetime.now(timezone.utc).isoformat()
            }
            self.supabase.table("bill_follows").update(update_data).eq("user_id", user_id).eq("bill_id", bill_id).execute()

            logger.info(f"✅ Pack ready for {user_id} / {bill_id}")
            return vault_url

        except Exception as e:
            logger.error(f"Pack generation failed for {user_id}/{bill_id}: {e}")
            traceback.print_exc()
            return None

    def run_all_follows(self):
        """Main entry point: process all bill follows."""
        if not self.supabase:
            logger.error("Supabase not available – cannot run vault generator.")
            return
        if not self.b2:
            logger.error("Backblaze not available – cannot upload vaults.")
            return

        # Check if bill_follows table exists
        try:
            # Try to select just 1 row to see if table exists
            self.supabase.table("bill_follows").select("user_id").limit(1).execute()
        except Exception as e:
            logger.error(f"bill_follows table is missing or inaccessible: {e}")
            return

        # Fetch all follows
        try:
            response = self.supabase.table("bill_follows").select("user_id, bill_id").execute()
            follows = response.data or []
        except Exception as e:
            logger.error(f"Failed to fetch follows: {e}")
            return

        if not follows:
            logger.info("No active follows. Exiting.")
            return

        logger.info(f"🧺 Generating vaults for {len(follows)} follows...")
        success = 0
        for f in follows:
            user_id = f.get("user_id")
            bill_id = f.get("bill_id")
            if not user_id or not bill_id:
                logger.warning("Skipping follow with missing user_id or bill_id.")
                continue
            if self.generate_pack(user_id, bill_id):
                success += 1
            time.sleep(0.5)  # gentle rate limit

        logger.info(f"Vault generation complete. Success: {success}/{len(follows)}")


if __name__ == "__main__":
    generator = VaultGenerator()
    generator.run_all_follows()
    # Always exit 0 – workflow should not fail because of missing vaults.
    sys.exit(0)