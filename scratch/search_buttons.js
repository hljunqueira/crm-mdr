import fs from 'fs';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx';

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const matches = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('<button') || line.includes('onClick=') || line.includes('Status') || line.includes('Imprimir')) {
      if (lineNum > 1500 && lineNum < 3000) {
        matches.push({ lineNum, text: line.trim() });
      }
    }
  });

  console.log(`Found ${matches.length} matching lines in the render block:`);
  matches.slice(0, 40).forEach(m => {
    console.log(`  Line ${m.lineNum}: ${m.text}`);
  });

} catch (err) {
  console.error(err);
}
