import os
import json
import logging
from scripts.supabase_direct import SupabaseDirect
from scripts.stage_detector import StageDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_fix():
    detector = StageDetector()
    db = SupabaseDirect()
    
    # Target Finance Bill 2026
    bill_id = "5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e"
    bills = db.select("bills", eq="id", eq_val=bill_id)
    if not bills:
        logger.error("Bill not found.")
        return
    
    bill = bills[0]
    logger.info(f"Verifying bill: {bill['title']} (Current Status: {bill['status']})")
    
    # Run targeted detection
    success = detector.detect_stages_from_document(bill_id)
    
    # Check status again
    updated_bills = db.select("bills", eq="id", eq_val=bill_id)
    updated_bill = updated_bills[0]
    logger.info(f"Status after detection: {updated_bill['status']}")
    
    if updated_bill['status'] == "DISCARDED":
        logger.error("❌ FAILURE: Status reverted to DISCARDED.")
    else:
        logger.info("✅ SUCCESS: Status remained stable.")

if __name__ == "__main__":
    verify_fix()
