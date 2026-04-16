import os
import sys
import time
import logging
import subprocess
from datetime import datetime, timezone
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [SOVEREIGN-MASTER] - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("sovereign_sync.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ===================================================================
#  SOVEREIGN SYNC MASTER — The CEKA Intelligence Heartbeat
# ===================================================================

def run_script(script_name: str, args: list = []):
    """Run a python script and log its output."""
    logger.info(f"🚀 Starting: {script_name}...")
    start_time = time.time()
    
    script_path = Path(__file__).parent / script_name
    if not script_path.exists():
        logger.error(f"❌ Script not found: {script_name}")
        return False

    try:
        cmd = [sys.executable, str(script_path)] + args
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Log summary or errors
        if result.stderr:
            logger.warning(f"  [STDERR] {result.stderr[:500]}...")
        
        duration = time.time() - start_time
        logger.info(f"✅ Completed: {script_name} in {duration:.2f}s")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed: {script_name}")
        logger.error(f"  Return code: {e.returncode}")
        logger.error(f"  Output: {e.output[:1000]}")
        return False
    except Exception as e:
        logger.error(f"❌ Error running {script_name}: {e}")
        return False

def sync_cycle():
    """Execute the full 5-stage intelligence pipeline."""
    logger.info("\n" + "="*80)
    logger.info(f"CEKA SOVEREIGN SYNC CYCLE — {datetime.now(timezone.utc).isoformat()}")
    logger.info("="*80 + "\n")

    # PHASE 1: Scrape New Legislative Documents (Bills/Gazette)
    # This also mirrors PDFs to Backblaze B2 immediately.
    run_script("legislative_scraper.py")

    # PHASE 2: Detect Legislative Stages (First/Second Reading, etc.)
    # Scrapes Order Papers, Hansard, and Gazette for status updates.
    run_script("stage_detector.py")

    # PHASE 3: News Intelligence Harvesting
    # Scrapes all 22+ tiered news sources for bill mentions.
    run_script("news_intelligence.py")

    # PHASE 4: Intelligent Corroboration & AI Synthesis
    # Generates summaries, implications, and constitutional anchors.
    run_script("sovereign_corroborator.py")

    # PHASE 5: User Vault Packaging
    # Bundles docs into packs for users who "Followed" bills.
    run_script("vault_generator.py")

    logger.info("\n" + "="*80)
    logger.info(f"SOVEREIGN SYNC CYCLE COMPLETE — Total duration: [Check individual logs]")
    logger.info("="*80 + "\n")

if __name__ == "__main__":
    # If run with --daemon, it sleeps and repeats (v1 simplified)
    # Best used with a cron job on Railway/GitHub Actions.
    sync_cycle()
