const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
const tables = ['stores', 'profiles', 'customers', 'devices', 'sales', 'installments'];
for (const table of tables) {
  try {
    const row = db.prepare(`select count(*) as count from ${table}`).get();
    console.log(`${table}: ${row.count}`);
  } catch (e) {
    console.log(`${table}: error ${e.message}`);
  }
}
