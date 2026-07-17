const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log('Sync Queue items:', db.prepare('select * from sync_queue').all());
