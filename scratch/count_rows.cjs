const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'react-example')
  : path.join(process.cwd(), 'data');

const dbFile = path.join(userDataPath, 'database.db');
console.log(`Database at: ${dbFile}`);

const sqlite = new Database(dbFile);

const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Row counts for each table:");
for (const t of tables) {
  try {
    const count = sqlite.prepare(`SELECT count(*) as count FROM \`${t.name}\``).get().count;
    console.log(`  - ${t.name}: ${count} rows`);
  } catch (err) {
    console.log(`  - ${t.name}: Error: ${err.message}`);
  }
}
process.exit(0);
