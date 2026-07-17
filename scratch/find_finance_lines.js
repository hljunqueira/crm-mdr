import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/Finance.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('recibo') || line.includes('Recibo') || line.includes('print') || line.includes('Printer')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
