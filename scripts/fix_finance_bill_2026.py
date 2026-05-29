"""
fix_finance_bill_2026.py
Corrects the Finance Bill, 2026 status from ASSENT → 1ST READING,
cleans the corrupted stages JSON, and sets status_lock = true 
to prevent future automated overwrites.

Bill ID: 5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e
"""
import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("SUPABASE_DB_POOLED_URL")
BILL_ID = "5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e"

# The correct stages JSON: only publication and first_reading are completed.
# All other stages that were falsely marked as completed are reset to pending.
CORRECT_STAGES = {
    "pre_publication": {
        "status": "completed",
        "completed_at": "2026-04-08"
    },
    "publication": {
        "status": "completed",
        "completed_at": "2026-05-05"
    },
    "first_reading": {
        "status": "completed",
        "completed_at": "2026-05-28",
        "source": "National Assembly Order Papers",
        "source_url": "https://www.parliament.go.ke/sites/default/files/2026-05/SUPPPLEMENTARY%20ORDER%20PAPER%20FOR%20THURSDAY%2028TH%20MAY%202026_1.pdf"
    },
    "second_reading": {"status": "pending"},
    "committee": {"status": "pending"},
    "report": {"status": "pending"},
    "third_reading": {"status": "pending"},
    "mediation": {"status": "pending"},
    "assent": {"status": "pending"},
    "discarded": {"status": "pending"}
}

def main():
    print("=" * 70)
    print("CEKA Finance Bill 2026 — Emergency Status Correction")
    print("=" * 70)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # 1. Audit: Show current state
    cur.execute(
        "SELECT status, status_lock, stages FROM bills WHERE id = %s",
        (BILL_ID,)
    )
    row = cur.fetchone()
    if not row:
        print(f"[ERROR] Bill {BILL_ID} not found!")
        cur.close()
        conn.close()
        return

    current_status, current_lock, current_stages = row
    print(f"\n[AUDIT] Current State:")
    print(f"  Status:      {current_status}")
    print(f"  Status Lock: {current_lock}")
    print(f"  Stages:      (see below)")
    
    if current_stages:
        stages_dict = current_stages if isinstance(current_stages, dict) else json.loads(current_stages)
        for k, v in stages_dict.items():
            if isinstance(v, dict) and v.get("status") == "completed":
                print(f"    ✅ {k}: completed ({v.get('completed_at', 'N/A')})")
            else:
                print(f"    ⏳ {k}: pending")

    # 2. Execute: Correct status, stages, and set lock
    cur.execute(
        """
        UPDATE bills SET
            status = '1ST READING',
            stages = %s::jsonb,
            status_lock = true,
            updated_at = NOW()
        WHERE id = %s
        """,
        (json.dumps(CORRECT_STAGES), BILL_ID)
    )
    conn.commit()
    print(f"\n[FIXED] Applied corrections:")
    print(f"  Status:      ASSENT → 1ST READING")
    print(f"  Status Lock: {current_lock} → true")
    print(f"  Stages:      Cleaned — only pre_publication, publication, first_reading marked completed")

    # 3. Verify
    cur.execute(
        "SELECT status, status_lock FROM bills WHERE id = %s",
        (BILL_ID,)
    )
    verified = cur.fetchone()
    print(f"\n[VERIFY] Post-correction state:")
    print(f"  Status:      {verified[0]}")
    print(f"  Status Lock: {verified[1]}")

    cur.close()
    conn.close()
    print("\n[DONE] Finance Bill 2026 status corrected and locked.")

if __name__ == "__main__":
    main()
