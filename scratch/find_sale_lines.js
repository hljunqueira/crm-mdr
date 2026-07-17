const fs = require('fs');
try {
  const utf8 = fs.readFileSync('src/components/sales/SaleForm.tsx', 'utf8');
  console.log('UTF-8 length:', utf8.length);
  if (utf8.includes('original_price')) {
    console.log('UTF-8 includes original_price');
  }
} catch (e) {
  console.error(e);
}
