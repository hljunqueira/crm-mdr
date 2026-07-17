const fs = require('fs');
const utf8 = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
const lines = utf8.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('original_price:')) {
    console.log(`\n--- Occurrence at line ${idx + 1} ---`);
    for (let i = idx - 5; i <= idx + 5; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
});
