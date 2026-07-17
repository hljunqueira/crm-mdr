const fs = require('fs');
const content = fs.readFileSync('src/components/sales/ContractPrint.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('toLocaleString') || line.includes('R$')) {
    if (line.includes('sale.') || line.includes('financed') || line.includes('fee') || line.includes('basePrice') || line.includes('originalPrice')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
