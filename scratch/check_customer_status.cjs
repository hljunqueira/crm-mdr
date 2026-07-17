const Database = require('better-sqlite3');
const db = new Database('/app/data/database.db');
console.log(db.prepare("select * from customers where name like '%Joares%'").all());
