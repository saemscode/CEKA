
import os
import sqlalchemy
from sqlalchemy import create_all_engines, text
from pathlib import Path
from dotenv import load_dotenv

env_path = Path("d:/CEKA/ceka v010/CEKA/.env")
load_dotenv(dotenv_path=str(env_path))

db_url = os.getenv("SUPABASE_DB_POOLED_URL")

if not db_url:
    print("Error: Missing SUPABASE_DB_POOLED_URL")
    exit(1)

# Fix for standard postgres url if needed (it starts with postgresql://)
engine = sqlalchemy.create_engine(db_url)

with engine.connect() as conn:
    # 1. Total Count
    result = conn.execute(text("SELECT COUNT(*) FROM signatures;"))
    total = result.scalar()
    print(f"Total signatures in table: {total}")

    # 2. Count by bill
    result = conn.execute(text("SELECT bill_id, COUNT(*) as count FROM signatures GROUP BY bill_id;"))
    print("Signatures per bill:")
    for row in result:
        print(f"  {row[0]}: {row[1]}")

    # 3. Check for specific bill
    bill_id = "35d237a9-fc9d-4a20-8e17-c5c0ff79848b"
    result = conn.execute(text(f"SELECT COUNT(*) FROM signatures WHERE bill_id = '{bill_id}';"))
    count = result.scalar()
    print(f"Signatures for bill {bill_id}: {count}")

    # 4. Check for verified vs unverified
    result = conn.execute(text("SELECT is_verified, COUNT(*) FROM signatures GROUP BY is_verified;"))
    print("Verification status:")
    for row in result:
        print(f"  Verified={row[0]}: {row[1]}")
