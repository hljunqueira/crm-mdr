import fs from 'fs';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('updateServiceOrder') && (line.includes('onChange') || line.includes('input') || line.includes('textarea'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
