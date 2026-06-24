import fs from 'fs';

const content = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Buscar cliente por nome ou CPF...')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
