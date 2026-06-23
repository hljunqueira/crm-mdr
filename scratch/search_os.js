import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/src/pages/ServiceOrders.tsx';

const keywords = ['offerRedirectToSales'];

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);

  const results = {};
  keywords.forEach(kw => {
    results[kw] = [];
  });

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    keywords.forEach(kw => {
      const regex = new RegExp('\\b' + kw + '\\b', 'i');
      if (regex.test(line)) {
        results[kw].append ? results[kw].append({ lineNum, text: line.trim() }) : results[kw].push({ lineNum, text: line.trim() });
      }
    });
  });

  keywords.forEach(kw => {
    const matches = results[kw];
    if (matches && matches.length > 0) {
      console.log(`\n=== Matches for '${kw}' (first 10): ===`);
      matches.slice(0, 10).forEach(m => {
        console.log(`  Line ${m.lineNum}: ${m.text}`);
      });
    }
  });

} catch (err) {
  console.error('Error:', err);
}
