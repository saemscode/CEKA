import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

def query_db(sql):
    # Using a generic RPC if it exists, otherwise just trying to fetch from info schema
    try:
        # We try to use a common pattern in Supabase projects: an RPC that can run arbitrary SQL (if enabled)
        # OR we just query the information_schema directly via PostgREST
        res = supabase.from_("information_schema.triggers").select("trigger_name, event_object_table, action_statement").eq("event_object_table", "bills").execute()
        return res.data
    except Exception as e:
        return str(e)

print("--- DIAGNOSING BILLS TABLE TRIGGERS ---")
triggers = query_db("")
if isinstance(triggers, list):
    if not triggers:
        print("No triggers found on 'bills' table in information_schema.")
    else:
        for t in triggers:
            print(f"Trigger: {t['trigger_name']}")
            print(f"Table: {t['event_object_table']}")
            print(f"Statement: {t.get('action_statement', 'N/A')}")
            print("-" * 20)
else:
    print(f"Error querying triggers: {triggers}")

print("\n--- CHECKING FOR 'Discarded' IN PUBLIC FUNCTIONS ---")
try:
    res = supabase.from_("information_schema.routines").select("routine_name, routine_definition").ilike("routine_definition", "%Discarded%").execute()
    if res.data:
        for r in res.data:
            print(f"Function: {r['routine_name']}")
            # print(f"Definition: {r['routine_definition'][:500]}...")
            print("-" * 20)
    else:
        print("No functions found containing 'Discarded'.")
except Exception as e:
    print(f"Error querying routines: {e}")

print("\n--- CHECKING FINANCE BILL 2026 DATA ---")
try:
    res = supabase.from_("bills").select("*").ilike("title", "%Finance Bill 2026%").execute()
    if res.data:
        bill = res.data[0]
        print(f"Bill ID: {bill['id']}")
        print(f"Title: {bill['title']}")
        print(f"Status: {bill['status']}")
        print(f"Metadata: {bill.get('metadata', 'N/A')}")
        print(f"Analysis Status: {bill.get('analysis_status', 'N/A')}")
    else:
        print("Finance Bill 2026 not found in database.")
except Exception as e:
    print(f"Error querying bill: {e}")
