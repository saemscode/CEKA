"""
fix_hammer_sponsors.py
Cleans up placeholder sponsor values left by ocr_hammer.ts / ocr_worker.ts
Sets them to NULL so the scraper/reprocessor can fill them with real data on next pass.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("SUPABASE_DB_POOLED_URL")

PLACEHOLDER_SPONSORS = [
    "RECOVERED_VIA_HAMMER_V1.8",
    "Extracted via CEKA OCR HAMMER",
    "OCR_REQUIRED",
]

def main():
    print("=" * 60)
    print("CEKA Sponsor Cleanup — Purging Hammer Placeholders")
    print("=" * 60)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # 1. Audit: Show affected rows
    cur.execute(
        "SELECT id, title, sponsor FROM bills WHERE sponsor = ANY(%s)",
        (PLACEHOLDER_SPONSORS,)
    )
    rows = cur.fetchall()
    print(f"\n[AUDIT] Found {len(rows)} bills with placeholder sponsors:\n")
    for row in rows:
        print(f"  ID: {row[0]}")
        print(f"  Title: {row[1]}")
        print(f"  Sponsor (DIRTY): {row[2]}")
        print()

    if not rows:
        print("[OK] No placeholder sponsors found. Database is clean.")
        cur.close()
        conn.close()
        return

    # 2. Execute: Set sponsor to NULL for all affected rows
    cur.execute(
        "UPDATE bills SET sponsor = NULL WHERE sponsor = ANY(%s)",
        (PLACEHOLDER_SPONSORS,)
    )
    affected = cur.rowcount
    conn.commit()

    print(f"[FIXED] Set sponsor = NULL for {affected} bills.")

    # 3. Verify
    cur.execute(
        "SELECT COUNT(*) FROM bills WHERE sponsor = ANY(%s)",
        (PLACEHOLDER_SPONSORS,)
    )
    remaining = cur.fetchone()[0]
    print(f"[VERIFY] Remaining placeholder sponsors: {remaining}")

    cur.close()
    conn.close()
    print("\n[DONE] Sponsor cleanup complete.")

if __name__ == "__main__":
    main()
