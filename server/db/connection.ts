import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getTableName, getTableColumns } from 'drizzle-orm';
import * as schema from './schema.js';

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

// Executa migrações automáticas ao iniciar com rotina autorelato/autocorreção
try {
  const isESM = typeof import.meta.url !== 'undefined';
  const dirname = isESM 
    ? path.dirname(fileURLToPath(import.meta.url)) 
    : __dirname;

  const migrationsFolder = path.join(dirname, 'migrations');
  console.log(`[Database] Rodando migrações da pasta: ${migrationsFolder}`);
  
  // 1. Executa instruções SQL de criação de tabelas manualmente se houver o arquivo 0000
  const sqlFile = path.join(migrationsFolder, '0000_serious_purple_man.sql');
  if (fs.existsSync(sqlFile)) {
    console.log('[Database] Garantindo existência das tabelas via script SQL de migração...');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    const statements = sqlContent.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        sqlite.prepare(trimmed).run();
      } catch (err: any) {
        if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
          // Silenciosamente ignora tabelas/índices que já existem
        } else {
          console.warn(`[Database] Aviso na migração manual de tabelas: ${err.message}`);
        }
      }
    }
  }

  // 2. Auto-patcher para colunas ausentes em tabelas existentes
  console.log("[Database] Verificando integridade das colunas...");
  for (const [exportName, tableObj] of Object.entries(schema)) {
    if (typeof tableObj === 'object' && tableObj !== null && '_' in tableObj) {
      try {
        const tableName = getTableName(tableObj as any);
        const columns = getTableColumns(tableObj as any);
        
        const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (tableCheck) {
          const pragmaInfo = sqlite.prepare(`PRAGMA table_info(\`${tableName}\`)`).all() as any[];
          const existingColumns = new Set(pragmaInfo.map(c => c.name.toLowerCase()));
          
          for (const [colKey, colObj] of Object.entries(columns)) {
            const colName = (colObj as any).name;
            if (!existingColumns.has(colName.toLowerCase())) {
              console.log(`[Database] Adicionando coluna ausente: ${tableName}.${colName}`);
              
              let sqlType = 'TEXT';
              const dataType = (colObj as any).dataType;
              if (dataType === 'number') {
                sqlType = (colObj as any).columnType === 'SQLiteReal' ? 'REAL' : 'INTEGER';
              } else if (dataType === 'boolean') {
                sqlType = 'INTEGER';
              }
              
              sqlite.prepare(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${sqlType}`).run();
            }
          }
        }
      } catch (tableErr) {
        console.error(`[Database] Erro ao sincronizar colunas de ${exportName}:`, tableErr);
      }
    }
  }

  // 3. Deixa o drizzle marcar as migrações como concluídas no banco
  try {
    migrate(db, { migrationsFolder });
  } catch (e: any) {
    // Se falhar apenas por tabela já existente no controle interno, ignora
    if (!e.message.includes('already exists')) {
      throw e;
    }
  }
  console.log('[Database] Migrações e correções de esquema aplicadas com sucesso!');
} catch (error) {
  console.error('[Database] Erro ao aplicar migrações:', error);
}
