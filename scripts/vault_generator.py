import os
import json
import logging
import time
import zipfile
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

# ---------------------------------------------------------------------------
# Load environment variables
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

try:
    from backblaze_utils import BackblazeVault
    B2_OK = True
except ImportError:
    B2_OK = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [VAULT-GEN] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("vault_generator.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VaultGenerator:
    """
    Generates 'Civic Intelligence Packs' for users following bills.
    Bundles: PDF Bill + AI Summary JSON + News Snippets + Verification Report.
    """

    def __init__(self):
        self.supabase = None
        if SUPABASE_OK:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self.supabase = create_client(url, key)
        
        self.b2 = None
        if B2_OK:
            self.b2 = BackblazeVault()

    def generate_pack(self, user_id: str, bill_id: str) -> Optional[str]:
        """Bundle and upload a pack for a user/bill pair."""
        if not self.supabase or not self.b2: return None

        logger.info(f"📦 Generating Civic Pack for User {user_id[-8:]} / Bill {bill_id[-8:]}")

        try:
            # 1. Fetch data
            bill_resp = self.supabase.table("bills").select("*").eq("id", bill_id).single().execute()
            bill = bill_resp.data
            news_resp = self.supabase.table("bill_news_mentions").select("*").eq("bill_id", bill_id).execute()
            news = news_resp.data or []

            # 2. Build ZIP in memory
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                # A. Analysis Report (Markdown)
                report = f"# Civic Intelligence Report: {bill['title']}\n"
                report += f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%EAT')}\n\n"
                report += f"## Official Status\n- **Stage:** {bill['status']}\n- **Introduced:** {bill['date']}\n- **Sponsor:** {bill['sponsor']}\n\n"
                report += f"## Intelligence Summary\n{bill.get('neural_summary', 'AI analysis pending.')}\n\n"
                report += f"## News Corroboration\n"
                for m in news:
                    report += f"- [{m['source_name']}] {m['headline']} (Source: {m['article_url']})\n"
                
                zip_file.writestr("REPORT.md", report)

                # B. Machine-Readable Intelligence (JSON)
                intel_json = {
                    "bill": bill,
                    "news": news,
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }
                zip_file.writestr("intelligence.json", json.dumps(intel_json, indent=2))

                # C. Bill text if available
                if bill.get("text_content"):
                    zip_file.writestr("OFFICIAL_TEXT.txt", bill["text_content"])

            # 3. Upload to B2 (User Vault)
            remote_path = f"user-vaults/{user_id}/{bill_id}/civic_pack.zip"
            vault_url = self.b2.upload_bytes(zip_buffer.getvalue(), remote_path, content_type="application/zip")
            
            # 4. Store signed URL (refreshed daily) in Supabase
            # We use the public URL but the UI layer signs it if private.
            self.supabase.table("bill_follows").update({
                "vault_url": vault_url,
                "vault_refreshed_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).eq("bill_id", bill_id).execute()

            logger.info(f"✅ Pack ready: {remote_path}")
            return vault_url

        except Exception as e:
            logger.error(f"Failed to generate pack: {e}")
            return None

    def run_all_follows(self):
        """Process all follows that need pack refreshment."""
        if not self.supabase: return
        
        try:
            # Fetch follows where vault is old or missing
            # For efficiency, we refresh vault if bill was updated OR vault is missing
            response = self.supabase.table("bill_follows").select("user_id, bill_id").execute()
            follows = response.data or []

            logger.info(f"🧺 Refreshing vaults for {len(follows)} follows...")
            for f in follows:
                self.generate_pack(f["user_id"], f["bill_id"])
        except Exception as e:
            logger.error(f"Vault batch failed: {e}")

if __name__ == "__main__":
    generator = VaultGenerator()
    generator.run_all_follows()
