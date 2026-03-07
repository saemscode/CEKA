import os
from supabase import create_client, Client

# Robust .env loader
def load_env_file():
    env_path = "d:/CEKA/ceka v010/CEKA/.env"
    try:
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()
            print(f"Loaded environment variables from {env_path}")
    except Exception as e:
        print(f"Failed to load .env file: {str(e)}")

load_env_file()

SUPABASE_URL = "https://cajrvemigxghnfmyopiy.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Check Chapters
    chapters = supabase.table("constitution_chapters").select("*").order("chapter_number").execute()
    print(f"✅ Found {len(chapters.data)} chapters in 'constitution_chapters'.")
    for chap in chapters.data:
        print(f"  - Chapter {chap.get('chapter_number')}: {chap.get('title_en')}")
    
    # Check Sections
    sections = supabase.table("constitution_sections").select("*").execute()
    print(f"\n✅ Found {len(sections.data)} articles in 'constitution_sections'.")
    
    # Group by Chapter
    stats = {}
    for sec in sections.data:
        cid = sec.get('chapter_id')
        stats[cid] = stats.get(cid, 0) + 1
        
    for chap in chapters.data:
        cid = chap.get('id')
        count = stats.get(cid, 0)
        print(f"  - Chapter {chap.get('chapter_number')}: {count} articles")

except Exception as e:
    print(f"❌ Error querying DB: {str(e)}")
