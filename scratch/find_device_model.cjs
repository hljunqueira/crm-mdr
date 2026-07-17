const fs = require('fs');
const content = fs.readFileSync('src/components/sales/ContractPrint.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('device_model') || line.includes('imei') || line.includes('accessories')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
