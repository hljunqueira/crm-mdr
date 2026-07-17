import fs from 'fs';
import path from 'path';

const appData = process.env.APPDATA || '';
const folders = fs.readdirSync(appData);
const matches = folders.filter(f => 
  f.toLowerCase().includes('mdr') || 
  f.toLowerCase().includes('react') || 
  f.toLowerCase().includes('crm')
);

console.log('Matching folders in AppData/Roaming:', matches);
for (const match of matches) {
  const p = path.join(appData, match);
  try {
    const files = fs.readdirSync(p);
    console.log(`Files in ${match}:`, files);
  } catch (e) {}
}
