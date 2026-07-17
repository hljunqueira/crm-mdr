const fs = require('fs');

function searchInFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  console.log(`\n--- Search in ${filepath} ---`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('descont') || line.toLowerCase().includes('original') || line.toLowerCase().includes('econom')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

searchInFile('src/components/sales/ContractPrint.tsx');
searchInFile('src/components/sales/SaleReceiptPrint.tsx');
