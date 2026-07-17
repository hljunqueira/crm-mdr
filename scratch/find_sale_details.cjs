const fs = require('fs');
const utf8 = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
const lines = utf8.split('\n');

console.log('--- Lines 590 to 625 ---');
for (let i = 589; i < 625; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

console.log('\n--- Lines 1235 to 1260 ---');
for (let i = 1234; i < 1260; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
