import struct

file_path = r"C:\Users\Henrique - PC\Desktop\Projetos Dev\crm-mdr\importar-produtos.xls"

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

for r in range(max_row + 1):
    desc = cells.get((r, 2), "")
    if "hub usb 3.0" in desc.lower():
        print(f"Row {r}: {[cells.get((r, c), '') for c in range(max_col + 1)]}")
