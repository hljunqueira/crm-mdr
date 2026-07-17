const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log(db.prepare("select id, name from customers").all());
