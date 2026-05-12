import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Get all table names in public schema
response = supabase.rpc('get_tables', {}).execute()
if response.data:
    print("Tables:", response.data)
else:
    # Fallback to a query if RPC doesn't exist
    print("No get_tables RPC found. Checking via information_schema...")
    res = supabase.from_("information_schema.tables").select("table_name").eq("table_schema", "public").execute()
    print("Tables:", [t['table_name'] for t in res.data])
