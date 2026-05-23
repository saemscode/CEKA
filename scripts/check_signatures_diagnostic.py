
import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

env_path = Path("d:/CEKA/ceka v010/CEKA/.env")
load_dotenv(dotenv_path=str(env_path))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# 1. Total Count
r = requests.get(f"{url}/rest/v1/signatures?select=id", headers=headers, params={"select": "id", "count": "exact"})
print(f"Total signatures in table: {r.headers.get('content-range')}")

# 2. Sample rows
r = requests.get(f"{url}/rest/v1/signatures?select=id,bill_id,full_name,is_verified&limit=5", headers=headers)
print("Sample signatures:")
print(json.dumps(r.json(), indent=2))

# 3. Check specific bill (Finance Bill 2026? or the one in the screenshot)
# The one in the screenshot is "The County Governments Additional Allocations Bill, No.8 Of 2026"
# UUID: 35d237a9-fc9d-4a20-8e17-c5c0ff79848b
bill_id = "35d237a9-fc9d-4a20-8e17-c5c0ff79848b"
r = requests.get(f"{url}/rest/v1/signatures?bill_id=eq.{bill_id}&select=id", headers=headers, params={"select": "id", "count": "exact"})
print(f"Signatures for bill {bill_id}: {r.headers.get('content-range')}")
