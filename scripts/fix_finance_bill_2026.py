import os
import json
import logging
from scripts.supabase_direct import SupabaseDirect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_finance_bill_2026():
    db = SupabaseDirect()
    
    # 1. Find the bill
    bills = db.select("bills", eq="title", eq_val="Finance Bill 2026")
    if not bills:
        # Try fuzzy match if exact fails
        logger.warning("Exact title 'Finance Bill 2026' not found. Searching for 'Finance Bill'...")
        bills = db.select("bills", columns="id,title,status,stages")
        bills = [b for b in bills if "Finance Bill 2026" in b['title']]

    if not bills:
        logger.error("Finance Bill 2026 not found.")
        return

    bill = bills[0]
    bill_id = bill['id']
    logger.info(f"Found bill: {bill['title']} (ID: {bill_id})")
    logger.info(f"Current status: {bill['status']}")
    
    # 2. Update status and purge stages history if it contains 'Discarded'
    new_status = "First Reading" # Reverting to a safe initial state
    
    # Handle stages JSONB if it exists
    stages = bill.get('stages', [])
    if isinstance(stages, str):
        try:
            stages = json.loads(stages)
        except:
            stages = []
    
    if not isinstance(stages, list):
        stages = []

    # Remove any Discarded entry from stages
    cleaned_stages = [s for s in stages if s.get('stage') != 'Discarded']
    
    update_data = {
        "status": new_status,
        "stages": cleaned_stages,
        "analysis_status": "pending" # Reset to allow re-analysis with corrected logic
    }
    
    logger.info(f"Updating bill to status: {new_status}")
    db.update("bills", update_data, eq="id", eq_val=bill_id)
    logger.info("Successfully corrected bill status.")

if __name__ == "__main__":
    fix_finance_bill_2026()
