const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'server', 'routes');
const files = fs.readdirSync(routesDir);

let totalCleaned = 0;

for (const file of files) {
  if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('syncQueue')) {
    console.log(`Cleaning syncQueue references in: ${file}`);
    
    // Remove import of syncQueue if present
    content = content.replace(/,\s*syncQueue/g, '');
    content = content.replace(/syncQueue,\s*/g, '');
    content = content.replace(/import\s*{\s*syncQueue\s*}\s*from\s*['"].*['"];?\n?/g, '');

    // Remove await db.insert(syncQueue)... blocks
    // Pattern matching try/catch or stand-alone await db.insert(syncQueue).values(...)
    content = content.replace(/await\s+db\.insert\(syncQueue\)[\s\S]*?;\n?/g, '// syncQueue insert removed (Supabase native mode)\n');
    content = content.replace(/try\s*{\s*\/\/\s*syncQueue[\s\S]*?}\s*catch[\s\S]*?}\n?/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
    totalCleaned++;
  }
}

console.log(`Cleaned syncQueue from ${totalCleaned} route files.`);
