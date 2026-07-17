const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log('Duplicate by phone:', db.prepare("select name, phone, unit_id from customers where phone like '%9967-0128%'").all());
