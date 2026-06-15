import struct
import unicodedata
import re
import requests
import json

file_path = r"C:\Users\Henrique - PC\Desktop\Projetos Dev\crm-mdr\importar-produtos.xls"
store_id = "b2b1f71d-0471-49a1-b151-865ccc3cd627" # ARROIO store
supabase_url = "https://supabase.mdrinformaticaecelulares.com.br"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

headers_api = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def normalize_key(s):
    s = unicodedata.normalize('NFD', s)
    s = s.encode('ascii', 'ignore').decode('ascii')
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

def fix_barcode(barcode):
    if not barcode:
        return None
    # Remove any non-digits
    barcode = re.sub(r'\D', '', barcode)
    if len(barcode) == 12:
        # Calculate EAN-13 check digit
        odds = sum(int(barcode[i]) for i in range(0, 12, 2))
        evens = sum(int(barcode[i]) for i in range(1, 12, 2))
        total = odds + evens * 3
        check_digit = (10 - (total % 10)) % 10
        full_barcode = barcode + str(check_digit)
        print(f"Fixed barcode: {barcode} -> {full_barcode}")
        return full_barcode
    return barcode

def classify_category(desc, grupo, tipo):
    d = desc.lower()
    g = grupo.lower()
    t = tipo.lower()
    if "celular" in g or "smartphone" in g or "celular" in t or "celular" in d:
        return "smartphone"
    if "tela" in d or "frontal" in d or "conector" in d or "peca" in d or "bateria" in d or "touch" in d or "display" in d:
        return "part"
    if any(x in d for x in ["capa", "pelicula", "carregador", "fone", "cabo", "suporte", "iphone", "magsafe", "adaptador", "usb"]):
        return "accessory_mobile"
    if any(x in d or x in g for x in ["mouse", "teclado", "webcam", "gabinete", "impressora", "ti", "it", "hdmi", "vga", "computador", "notebook"]):
        return "accessory_it"
    return "other"

def parse_float(val):
    if not val:
        return 0.0
    clean = val.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(clean)
    except:
        return 0.0

# 1. Clear existing items for this store to prevent duplicates
print("Deleting existing products for store...")
del_url = f"{supabase_url}/rest/v1/devices?store_id=eq.{store_id}"
try:
    del_res = requests.delete(del_url, headers=headers_api, timeout=30)
    if del_res.status_code in [200, 204]:
        print("Cleaned database successfully.")
    else:
        print(f"Warning/Error cleaning database: {del_res.status_code} - {del_res.text}")
except Exception as e:
    print(f"Timeout or error during delete: {e}")

# 2. Parse XLS and import
with open(file_path, "rb") as f:
    content = f.read()

cells = {}
offset = 0
while offset < len(content):
    if offset + 4 > len(content):
        break
    opcode, length = struct.unpack_from("<HH", content, offset)
    data = content[offset+4 : offset+4+length]
    if opcode == 0x0004: # LABEL
        row, col = struct.unpack_from("<HH", data, 0)
        str_len = data[7]
        string_bytes = data[8 : 8 + str_len]
        try:
            val = string_bytes.decode("cp1252").strip()
        except Exception:
            val = string_bytes.decode("utf-8", errors="ignore").strip()
        cells[(row, col)] = val
    offset += 4 + length

max_row = max(r for r, c in cells.keys()) if cells else 0
max_col = max(c for r, c in cells.keys()) if cells else 0

raw_headers = [cells.get((1, c), "").strip() for c in range(max_col + 1)]
headers = [normalize_key(h) for h in raw_headers]

imported_count = 0
skipped_count = 0

for r in range(2, max_row + 1):
    row_vals = {headers[c]: cells.get((r, c), "").strip() for c in range(max_col + 1) if c < len(headers) and headers[c]}
    desc = row_vals.get("descricao", "").strip()
    if not desc:
        continue
    
    qty_str = row_vals.get("disponivel", "0")
    try:
        qty = int(float(qty_str.replace(",", ".")))
    except:
        qty = 0
        
    if qty <= 0:
        skipped_count += 1
        continue

    brand_val = row_vals.get("marca", "").strip()
    first_word = desc.split(" ")[0] if desc else "-"
    brand = brand_val if brand_val else (first_word[:20] if len(first_word) > 20 else first_word)
    
    short_name = desc[:25].strip()
    cost_price = parse_float(row_vals.get("custo", "0"))
    sale_price = parse_float(row_vals.get("venda", "0"))
    
    raw_barcode = row_vals.get("codigo", "").strip()
    barcode = fix_barcode(raw_barcode)
    if not barcode or barcode.lower() == "none" or barcode.lower() == "null":
        barcode = None
        
    category = classify_category(desc, row_vals.get("grupo", ""), row_vals.get("tipo", ""))
    
    payload = {
        "store_id": store_id,
        "model": short_name,
        "brand": brand,
        "imei": None,
        "condition": "new",
        "cost_price": cost_price,
        "sale_price": sale_price,
        "status": "available",
        "stock_quantity": qty,
        "notes": desc,
        "category": category,
        "image_url": None,
        "show_on_landing": False,
        "barcode": barcode,
        "supplier": None,
        "purchase_date": None,
        "description": desc,
        "short_name": short_name
    }
    
    url = f"{supabase_url}/rest/v1/devices"
    try:
        res = requests.post(url, json=payload, headers=headers_api, timeout=10)
        if res.status_code in [200, 201]:
            imported_count += 1
            print(f"[{imported_count}] Imported: {desc} (Barcode: {barcode})")
        else:
            print(f"FAILED: '{desc}': {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Timeout/Error importing '{desc}': {e}")

print(f"\nImport finished!")
print(f"Total imported: {imported_count}")
print(f"Total skipped: {skipped_count}")
