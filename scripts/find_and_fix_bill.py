import os
import json
import logging
from scripts.supabase_direct import SupabaseDirect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def find_and_fix():
    db = SupabaseDirect()
    # List ALL bills to be safe
    bills = db.select("bills", columns="id,title,status,stages")
    
    candidates = []
    for b in bills:
        t = b['title'].lower()
        if "finance" in t and "2026" in t:
            candidates.append(b)
    
    with open("find_and_fix_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Found {len(candidates)} candidates for Finance Bill 2026\n")
        for b in candidates:
            f.write(f"- [{b['id']}] {b['title']} (Status: {b['status']})\n")
            
            # Fix it!
            new_status = "First Reading"
            stages = b.get('stages', [])
            if isinstance(stages, str):
                try: stages = json.loads(stages)
                except: stages = []
            
            if not isinstance(stages, list): stages = []
            
            cleaned_stages = [s for s in stages if s.get('stage') != 'Discarded']
            
            update_data = {
                "status": new_status,
                "stages": cleaned_stages,
                "analysis_status": "pending"
            }
            
            f.write(f"  Updating to {new_status}...\n")
            try:
                db.update("bills", update_data, eq="id", eq_val=b['id'])
                f.write("  SUCCESS\n")
            except Exception as e:
                f.write(f"  FAILED: {e}\n")

if __name__ == "__main__":
    find_and_fix()
