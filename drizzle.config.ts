import { defineConfig } from 'drizzle-kit';
import path from 'path';

// O banco de dados local para geração de migrações
export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./data/database.db',
  },
});
