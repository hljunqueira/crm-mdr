const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = fs.existsSync('/app/data') 
  ? '/app/data'
  : (process.env.APPDATA 
      ? path.join(process.env.APPDATA, 'CRM-MDR')
      : path.join(__dirname, '../data'));

const dbFile = path.join(userDataPath, 'database.db');
console.log('Target database:', dbFile);

if (fs.existsSync(dbFile)) {
  const db = new Database(dbFile);
  try {
    db.prepare('DROP INDEX IF EXISTS customers_cpf_unique').run();
    console.log('Successfully dropped customers_cpf_unique index!');
  } catch (e) {
    console.error('Error dropping index:', e.message);
  }
}
