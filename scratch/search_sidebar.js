import fs from 'fs';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/components/layout/OsSidebar.tsx';

const keywords = ['venda', 'pagamento', 'finalizar', 'concluir', 'status', 'faturar', 'faturamento', 'checkout', 'navigate', 'offerRedirectToSales'];

try {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      keywords.forEach(kw => {
        const regex = new RegExp('\\b' + kw + '\\b', 'i');
        if (regex.test(line)) {
          console.log(`  Line ${lineNum}: ${line.trim()}`);
        }
      });
    });
  } else {
    console.log("OsSidebar.tsx does not exist at this path.");
  }
} catch (err) {
  console.error(err);
}
