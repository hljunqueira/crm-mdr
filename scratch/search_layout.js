import fs from 'fs';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (['lg:grid', 'lg:col', 'lg:flex', 'grid-cols', 'sidebar', 'activeTab', 'OsSidebar'].some(k => line.includes(k))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
