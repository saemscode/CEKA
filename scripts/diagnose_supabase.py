import os
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

def diagnostic():
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    sr_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print(f"Testing URL: {url}")
    
    configs = [
        ("Anon Key (Standard)", anon_key, {"apikey": anon_key, "Authorization": f"Bearer {anon_key}"}),
        ("SR Key (Standard)", sr_key, {"apikey": sr_key, "Authorization": f"Bearer {sr_key}"}),
        ("SR Key (No Bearer)", sr_key, {"apikey": sr_key, "Authorization": sr_key}),
        ("SR Key (API Key only)", sr_key, {"apikey": sr_key}),
        ("SR Key (Authorization only)", sr_key, {"Authorization": f"Bearer {sr_key}"}),
        ("SR Key (Query Param)", sr_key, None),
    ]
    
    for label, key, headers in configs:
        if not key:
            print(f"[SKIP] {label}: Key missing in .env")
            continue
            
        try:
            if label == "SR Key (Query Param)":
                r = requests.get(f"{url}/rest/v1/bills?select=id&limit=1&apikey={key}", timeout=10)
            else:
                r = requests.get(f"{url}/rest/v1/bills?select=id&limit=1", headers=headers, timeout=10)
            print(f"[{r.status_code}] {label}: {r.text[:100]}")
        except Exception as e:
            print(f"[ERR] {label}: {e}")

if __name__ == "__main__":
    diagnostic()
