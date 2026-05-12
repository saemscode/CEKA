import sys
import os
sys.path.append(os.path.dirname(__file__))
from supabase_direct import SupabaseDirect
import json

def purge_discarded_state(bill_id):
    db = SupabaseDirect()
    # Fetch current stages
    res = db.select("bills", "stages,status", eq="id", eq_val=bill_id)
    if not res:
        print(f"❌ Bill {bill_id} not found.")
        return
    
    bill = res[0]
    stages = bill.get("stages") or {}
    if isinstance(stages, str):
        stages = json.loads(stages)
    
    if "discarded" in stages:
        print(f"🧹 Purging 'discarded' key from stages of bill {bill_id}...")
        del stages["discarded"]
        
        # Reset status if it was DISCARDED
        status = bill.get("status")
        if status == "DISCARDED":
            status = "PUBLISHED" # Reset to baseline, pipeline will re-detect
            
        db.update("bills", {"stages": stages, "status": status}, eq="id", eq_val=bill_id)
        print("✅ Purge complete. Ready for clean pipeline run.")
    else:
        print(f"ℹ️ No 'discarded' key found in bill {bill_id} stages.")

if __name__ == "__main__":
    # Finance Bill 2026 ID
    TARGET_ID = "5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e"
    purge_discarded_state(TARGET_ID)
