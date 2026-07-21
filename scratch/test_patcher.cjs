const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'react-example')
  : path.join(process.cwd(), 'data');

const dbFile = path.join(userDataPath, 'database.db');
console.log(`Patching database at: ${dbFile}`);

if (!fs.existsSync(dbFile)) {
  console.log("Database file not found!");
  process.exit(1);
}

const sqlite = new Database(dbFile);

const migrationsDir = path.join(__dirname, '../server/db/migrations');
const files = fs.readdirSync(migrationsDir);
const migrationFileName = files.find(f => f.startsWith('0000_') && f.endsWith('.sql'));

if (!migrationFileName) {
  console.log("Migration file 0000_*.sql not found!");
  process.exit(1);
}

const migrationFile = path.join(migrationsDir, migrationFileName);
console.log(`Reading migration file: ${migrationFile}`);

const sqlContent = fs.readFileSync(migrationFile, 'utf-8');
const statements = sqlContent.split('--> statement-breakpoint');

for (const stmt of statements) {
  const trimmed = stmt.trim();
  if (!trimmed) continue;

  // Match CREATE TABLE `tableName` (columns)
  const createTableMatch = trimmed.match(/CREATE TABLE\s+`?(\w+)`?\s*\((.*)\)/is);
  if (createTableMatch) {
    const tableName = createTableMatch[1];
    const columnsDef = createTableMatch[2];

    const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (!tableCheck) {
      console.log(`Table '${tableName}' does not exist. Creating...`);
      try {
        sqlite.prepare(trimmed).run();
        console.log(`Successfully created table '${tableName}'.`);
      } catch (err) {
        console.log(`Error creating table '${tableName}': ${err.message}`);
      }
    } else {
      // Table exists. Check for missing columns.
      const pragmaInfo = sqlite.prepare(`PRAGMA table_info(\`${tableName}\`)`).all();
      const existingColumns = new Set(pragmaInfo.map(c => c.name.toLowerCase()));

      // Basic column parser for migration lines
      const lines = columnsDef.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.toUpperCase().startsWith('FOREIGN KEY') || 
            trimmedLine.toUpperCase().startsWith('PRIMARY KEY') || 
            trimmedLine.toUpperCase().startsWith('UNIQUE')) {
          continue;
        }

        const colMatch = trimmedLine.match(/^`?(\w+)`?\s+(\w+)/);
        if (colMatch) {
          const colName = colMatch[1];
          const colType = colMatch[2];

          if (!existingColumns.has(colName.toLowerCase())) {
            console.log(`Column '${colName}' (${colType}) is missing in table '${tableName}'. Adding...`);
            const alterQuery = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colType}`;
            try {
              sqlite.prepare(alterQuery).run();
              console.log(`Successfully added column '${colName}' to table '${tableName}'.`);
            } catch (err) {
              console.log(`Error adding column '${colName}' to table '${tableName}': ${err.message}`);
            }
          }
        }
      }
    }
  } else {
    // Run index creation
    try {
      sqlite.prepare(trimmed).run();
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        // Safe to ignore
      } else {
        console.log(`Index/Constraint query error: ${err.message}`);
      }
    }
  }
}

// Clear drizzle migrations
try {
  sqlite.prepare("DROP TABLE IF EXISTS __drizzle_migrations").run();
  console.log("Cleared __drizzle_migrations table.");
} catch (err) {
  console.log(`Error clearing migrations table: ${err.message}`);
}

console.log("Database patching completed successfully.");
process.exit(0);
