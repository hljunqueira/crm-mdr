const fs = require('fs');
try {
  const utf8 = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
  console.log('UTF-8 length:', utf8.length);
  
  // Find all occurrences of original_price or similar
  const lines = utf8.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('original') || line.toLowerCase().includes('discount') || line.toLowerCase().includes('desconto')) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
} catch (e) {
  console.error(e);
}
