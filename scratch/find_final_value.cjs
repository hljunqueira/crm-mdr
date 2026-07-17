const fs = require('fs');
const utf8 = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
const lines = utf8.split('\n');

console.log('--- Lines 1050 to 1100 ---');
for (let i = 1049; i < 1100; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
