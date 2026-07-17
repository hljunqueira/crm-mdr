const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determinar o diretório do banco de dados (funcionando para local e container Docker)
const userDataPath = fs.existsSync('/app/data') 
  ? '/app/data'
  : (process.env.APPDATA 
      ? path.join(process.env.APPDATA, 'CRM-MDR')
      : path.join(__dirname, '../data'));

const dbFile = path.join(userDataPath, 'database.db');
console.log('Target database:', dbFile);

if (fs.existsSync(dbFile)) {
  const db = new Database(dbFile);
  
  const tables = ['stores', 'profiles', 'customers', 'devices', 'sales', 'installments'];
  for (const table of tables) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT DEFAULT 'pending_insert'`).run();
      console.log(`Added sync_status to ${table}`);
    } catch (e) {}
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`).run();
      console.log(`Added updated_at to ${table}`);
    } catch (e) {}
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN last_sync_by TEXT`).run();
      console.log(`Added last_sync_by to ${table}`);
    } catch (e) {}
  }
  console.log('All sync columns verified/added.');
} else {
  console.log('Database file not found at:', dbFile);
}
