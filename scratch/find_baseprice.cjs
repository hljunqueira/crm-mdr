const fs = require('fs');

function findInFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  console.log(`\n--- Matches in ${filepath} ---`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('basePrice')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

findInFile('src/components/sales/ContractPrint.tsx');
findInFile('src/components/sales/SaleReceiptPrint.tsx');
