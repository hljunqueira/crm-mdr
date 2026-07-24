const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'pages', 'Reports.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const replacements = [
  { from: /min-w-\[180px\]/g, to: 'min-w-45' },
  { from: /rounded-\[24px\]/g, to: 'rounded-3xl' },
  { from: /min-w-\[200px\]/g, to: 'min-w-50' },
  { from: /min-w-\[150px\]/g, to: 'min-w-37.5' },
  { from: /min-w-\[100px\]/g, to: 'min-w-25' },
  { from: /min-w-\[120px\]/g, to: 'min-w-30' },
  { from: /min-w-\[160px\]/g, to: 'min-w-40' },
  { from: /rounded-\[32px\]/g, to: 'rounded-4xl' },
  { from: /min-h-\[220px\]/g, to: 'min-h-55' },
  { from: /max-w-\[200px\]/g, to: 'max-w-50' },
  { from: /min-h-\[140px\]/g, to: 'min-h-35' },
  { from: /min-h-\[300px\]/g, to: 'min-h-75' }
];

let replaceCount = 0;

for (const r of replacements) {
  const matches = content.match(r.from);
  if (matches) {
    replaceCount += matches.length;
    content = content.replace(r.from, r.to);
  }
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Substituídos ${replaceCount} avisos de classes CSS no Reports.tsx.`);
