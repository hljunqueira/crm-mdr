const fs = require('fs');
const content = fs.readFileSync('src/components/sales/SaleReceiptPrint.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx > 250 && (line.includes('basePrice') || line.includes('Preço Base') || line.includes('Resumo Financeiro') || line.includes('Preço de Venda') || line.includes('Valor do Produto'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
