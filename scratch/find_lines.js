import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/components/sales/SaleReceiptPrint.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('basePrice') || line.includes('original_price')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
