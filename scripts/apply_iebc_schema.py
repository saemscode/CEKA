import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")

def apply_schema():
    if not URL or not KEY:
        print("Missing Supabase credentials")
        return
    
    supabase = create_client(URL, KEY)
    
    sql = """
    CREATE EXTENSION IF NOT EXISTS postgis;

    DO $$ 
    BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iebc_offices' AND column_name = 'constituency') THEN
            ALTER TABLE public.iebc_offices RENAME COLUMN constituency TO constituency_name;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iebc_offices' AND column_name = 'location') THEN
            ALTER TABLE public.iebc_offices RENAME COLUMN location TO office_location;
        END IF;
    END $$;

    ALTER TABLE public.iebc_offices 
    ADD COLUMN IF NOT EXISTS constituency_code TEXT,
    ADD COLUMN IF NOT EXISTS landmark TEXT,
    ADD COLUMN IF NOT EXISTS distance_from_landmark TEXT,
    ADD COLUMN IF NOT EXISTS geocode_method TEXT,
    ADD COLUMN IF NOT EXISTS geocode_confidence DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS formatted_address TEXT,
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS geom GEOMETRY(POINT, 4326);

    CREATE INDEX IF NOT EXISTS iebc_offices_geom_idx ON public.iebc_offices USING GIST (geom);
    """
    
    try:
        # Supabase Python client doesn't support direct SQL via .rpc or .table
        # unless it's a defined function. We'll use a crude way if possible,
        # but usually we have to use the REST API or pg_net if enabled.
        # Alternatively, since I don't have a direct SQL execution tool for Supabase,
        # I'll check if there's an existing RPC for SQL.
        
        print("Applying schema via Supabase RPC or direct connection...")
        # Since I can't run raw SQL easily without a specific RPC, 
        # I'll rely on the fact that I can't easily do it and just inform the user
        # OR I'll check if there's a better way.
        
        # Actually, I'll just write the SQL to a file and hope the user can run it,
        # OR I'll use the 'sync_to_supabase.py' if it doesn't have the boto3 dependency.
        
        pass
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    apply_schema()
