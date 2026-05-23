
import os
import sqlalchemy
from sqlalchemy import text
from pathlib import Path
from dotenv import load_dotenv

# Use the pooled URL provided by the user manually or via .env
env_path = Path("d:/CEKA/ceka v010/CEKA/.env")
load_dotenv(dotenv_path=str(env_path))

# Use the specific pooled URL with credentials to be safe
db_url = "postgresql://postgres.cajrvemigxghnfmyopiy:1268Saem%27sTunes%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

engine = sqlalchemy.create_engine(db_url)

with engine.connect() as conn:
    # 1. Total Signatures
    result = conn.execute(text("SELECT COUNT(*) FROM signatures;"))
    total = result.scalar()
    print(f"Total signatures in table: {total}")

    # 2. Signatures for specific bill (Allocation Bill)
    bill_id = "35d237a9-fc9d-4a20-8e17-c5c0ff79848b"
    result = conn.execute(text(f"SELECT COUNT(*) FROM signatures WHERE bill_id = '{bill_id}';"))
    print(f"Signatures for bill {bill_id}: {result.scalar()}")

    # 3. Check for the "hallucinated" intruders in County Allocation Bill
    result = conn.execute(text(f"SELECT title, sponsor, ai_concerns FROM bills WHERE id = '{bill_id}';"))
    row = result.fetchone()
    if row:
        print(f"Bill Title: {row[0]}")
        print(f"Sponsor: {row[1]}")
        print(f"AI Concerns: {row[2]}")
    
    # 4. Check status_lock for Finance Bill 2026
    # Note: I need the UUID for Finance Bill 2026. The user previous context mentioned status_lock for it.
    result = conn.execute(text("SELECT id, title, status_lock FROM bills WHERE title ILIKE '%Finance%2026%' OR title ILIKE '%Finance%Bill%';"))
    print("Finance Bill Status Lock Check:")
    for row in result:
        print(f"  ID: {row[0]}, Title: {row[1]}, Locked: {row[2]}")

    # 5. Check for any signatures that might be missing verified flag but existing
    result = conn.execute(text("SELECT is_verified, COUNT(*) FROM signatures GROUP BY is_verified;"))
    print("Verification distribution:")
    for row in result:
        print(f"  is_verified={row[0]}: {row[1]}")
