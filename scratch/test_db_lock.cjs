const Database = require('better-sqlite3');
try {
  const db = new Database('C:\\Users\\Henrique - PC\\AppData\\Roaming\\CRM-MDR\\database.db');
  console.log('Successfully opened database.db');
  db.close();
} catch (err) {
  console.error('Failed to open database.db:', err);
}
