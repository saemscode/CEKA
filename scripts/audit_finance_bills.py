import requests
import json

url = "https://cajrvemigxghnfmyopiy.supabase.co/rest/v1/bills?select=id,title,date"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhanJ2ZW1pZ3hnaG5mbXlvcGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyOTU1OTAsImV4cCI6MjA1OTg3MTU5MH0.sgItW4OBC9i-eKnnUDxdMB6qgGdXyiKAD9c6C2u40As",
}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    bills = response.json()
    finance_bills = [b for b in bills if "Finance Bill" in b['title']]
    print(f"Total Finance Bills: {len(finance_bills)}")
    for b in finance_bills:
        print(f"ID: {b['id']} | Title: {b['title']} | Date: {b['date']}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
