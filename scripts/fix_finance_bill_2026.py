import requests
import json

url = "https://cajrvemigxghnfmyopiy.supabase.co/rest/v1/bills?id=eq.5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanJ2ZW1pZ3hnaG5mbXlvcGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDyOTU1OTAsImV4cCI6MjA1OTg3MTU5MH0._PgYb_PnGbEIpWZ8VTswhYUuaII1MvqeXj1M5hP5HWM",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanJ2ZW1pZ3hnaG5mbXlvcGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDyOTU1OTAsImV4cCI6MjA1OTg3MTU5MH0._PgYb_PnGbEIpWZ8VTswhYUuaII1MvqeXj1M5hP5HWM",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

data = {
    "status": "FIRST_READING",
    "stages": {
        "pre_publication": {"status": "completed", "completed_at": "2026-04-08"},
        "publication": {"status": "completed", "completed_at": "2026-05-05"},
        "first_reading": {"status": "active"},
        "second_reading": {"status": "pending"},
        "committee": {"status": "pending"},
        "report": {"status": "pending"},
        "third_reading": {"status": "pending"},
        "mediation": {"status": "pending"},
        "assent": {"status": "pending"}
    },
    "title": "The Finance Bill, 2026",
    "description": "The Finance Bill, 2026"
}

response = requests.patch(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
