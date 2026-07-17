const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log(db.prepare('select unit_id, count(*) as count from customers group by unit_id').all());
