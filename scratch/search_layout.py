import re

file_path = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    # Find any line that contains grid-cols, col-span, sidebar, or activeTab
    if any(k in line for k in ['lg:grid', 'lg:col', 'lg:flex', 'grid-cols', 'sidebar', 'activeTab', 'OsSidebar']):
        print(f"Line {idx + 1}: {line.strip()}")
