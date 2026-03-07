import os
from supabase import create_client
from dotenv import load_dotenv

from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def check_embeddings():
    print("Checking constitution_embeddings table...")
    try:
        res = supabase.table("constitution_embeddings").select("count", count="exact").execute()
        count = res.count
        print(f"Total embeddings: {count}")
        
        if count == 0:
            print("ERROR: No embeddings found.")
            return

        print("\nFetching sample embedding metadata...")
        res = supabase.table("constitution_embeddings").select("clause_ref, chapter").limit(5).execute()
        for row in res.data:
            print(f"- {row['clause_ref']} ({row['chapter']})")

        print("\nTesting match_constitution RPC with a dummy vector...")
        # A dummy zero vector for dimension check
        zero_vector = [0.1] * 1536
        match_res = supabase.rpc("match_constitution", {
            "query_embedding": zero_vector,
            "match_threshold": -1.0, # Get anything
            "match_count": 1
        }).execute()
        
        if match_res.data:
            print(f"RPC Success! Matched: {match_res.data[0]['clause_ref']}")
        else:
            print("RPC returned no data (but didn't error).")

    except Exception as e:
        print(f"Error during check: {e}")

if __name__ == "__main__":
    check_embeddings()
