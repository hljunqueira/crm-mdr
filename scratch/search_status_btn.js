import fs from 'fs';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx';

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('delivered') || line.includes('pronto') || line.includes('Fechar / Concluir') || line.includes('os.status')) {
      if (lineNum > 2140 && lineNum < 3200) {
        console.log(`  Line ${lineNum}: ${line.trim()}`);
      }
    }
  });

} catch (err) {
  console.error(err);
}
