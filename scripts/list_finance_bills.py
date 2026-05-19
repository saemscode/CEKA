import os
import json
import logging
from scripts.supabase_direct import SupabaseDirect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def list_finance_bills():
    db = SupabaseDirect()
    bills = db.select("bills", columns="id,title,status")
    finance_bills = [b for b in bills if "finance" in b['title'].lower()]
    
    logger.info(f"Found {len(finance_bills)} finance bills:")
    for b in finance_bills:
        logger.info(f" - [{b['id'][:8]}] {b['title']} (Status: {b['status']})")

if __name__ == "__main__":
    list_finance_bills()
