import os
from dotenv import load_dotenv

print(f"ENV SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
load_dotenv(override=True)
print(f"DOTENV SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"CWD: {os.getcwd()}")
