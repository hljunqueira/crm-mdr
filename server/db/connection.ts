import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let userDataPath: string;

// Detecta se está rodando no Electron ou em produção Windows
if (process.versions.electron) {
  try {
    const { app } = require('electron');
    userDataPath = app.getPath('userData');
  } catch (e) {
    userDataPath = process.env.APPDATA 
      ? path.join(process.env.APPDATA, 'CRM-MDR')
      : path.join(process.cwd(), 'data');
  }
} else {
  userDataPath = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'CRM-MDR')
    : path.join(process.cwd(), 'data');
}

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

export const dbFile = path.join(userDataPath, 'database.db');
console.log(`[Database] Inicializando banco SQLite em: ${dbFile}`);

const sqlite = new Database(dbFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite);

// Executa migrações automáticas ao iniciar
try {
  const isESM = typeof import.meta.url !== 'undefined';
  const dirname = isESM 
    ? path.dirname(fileURLToPath(import.meta.url)) 
    : __dirname;

  const migrationsFolder = path.join(dirname, 'migrations');
  console.log(`[Database] Rodando migrações da pasta: ${migrationsFolder}`);
  
  migrate(db, { migrationsFolder });
  console.log('[Database] Migrações aplicadas com sucesso!');
} catch (error) {
  console.error('[Database] Erro ao aplicar migrações:', error);
}

