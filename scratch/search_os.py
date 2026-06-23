import re

file_path = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx'

keywords = ['venda', 'pagamento', 'finalizar', 'concluir', 'status', 'faturar', 'faturamento', 'checkout', 'navigate']

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

results = {}
for kw in keywords:
    results[kw] = []

for idx, line in enumerate(lines):
    for kw in keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', line, re.IGNORECASE):
            results[kw].append((idx + 1, line.strip()))

for kw, matches in results.items():
    if matches:
        print(f"\n=== Matches for '{kw}' (first 10): ===")
        for line_num, content in matches[:10]:
            print(f"  Line {line_num}: {content}")
