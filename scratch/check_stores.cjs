const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log('Stores:', db.prepare('select * from stores').all());
