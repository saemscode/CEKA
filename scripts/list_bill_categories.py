import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables with override to ignore global environment
env_path = os.path.join(os.getcwd(), '.env')
load_dotenv(dotenv_path=env_path, override=True)

# Explicitly prioritize the one from .env
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

def list_categories():
    res = supabase.from_("bills").select("category").execute()
    if res.data:
        categories = set(b['category'] for b in res.data if b.get('category'))
        print("CATEOGRIES_LIST_START")
        for cat in sorted(list(categories)):
            print(cat)
        print("CATEOGRIES_LIST_END")
    else:
        print("No bills found.")

if __name__ == "__main__":
    list_categories()
