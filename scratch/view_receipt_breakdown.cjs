const fs = require('fs');
const content = fs.readFileSync('src/components/sales/SaleReceiptPrint.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('basePrice') || line.includes('financed') || line.includes('total_value') || line.includes('down_payment')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
