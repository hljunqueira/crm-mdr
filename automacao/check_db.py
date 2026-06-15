import requests

store_id = "b2b1f71d-0471-49a1-b151-865ccc3cd627"
supabase_url = "https://supabase.mdrinformaticaecelulares.com.br"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "count=exact"
}

# Check count
count_url = f"{supabase_url}/rest/v1/devices?store_id=eq.{store_id}&select=id"
r = requests.get(count_url, headers=headers)
print("Count response status:", r.status_code)
if r.status_code == 200:
    print("Content-Range (count):", r.headers.get("Content-Range"))
    print("Total items:", len(r.json()))
else:
    print("Error:", r.text)
