const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'react-example')
  : path.join(process.cwd(), 'data');

const dbFile = path.join(userDataPath, 'database.db');
const sqlite = new Database(dbFile);

sqlite.prepare('DROP TABLE IF EXISTS credit_card_bill_payments').run();
sqlite.prepare('DROP TABLE IF EXISTS credit_card_bills').run();
sqlite.prepare('DROP TABLE IF EXISTS monthly_financial_forecasts').run();
console.log('Outdated financial tables dropped successfully.');
process.exit(0);
