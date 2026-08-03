import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const queries = [
  `ALTER TABLE installments ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;`,
  `ALTER TABLE installments ADD COLUMN IF NOT EXISTS last_reminder_type TEXT;`
];

async function runMigrations() {
  const connectionConfigs = [
    {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'your-super-secret-and-long-postgres-password',
      database: 'postgres'
    },
    {
      host: 'supabase.mdrinformaticaecelulares.com.br',
      port: 5432,
      user: 'postgres',
      password: 'your-super-secret-and-long-postgres-password',
      database: 'postgres'
    },
    {
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'your-super-secret-and-long-postgres-password',
      database: 'postgres'
    }
  ];

  for (const config of connectionConfigs) {
    console.log(`Trying to connect to ${config.host}:${config.port}...`);
    const client = new Client(config);
    try {
      await client.connect();
      console.log(`Connected successfully to ${config.host}:${config.port}! Running queries...`);
      for (const query of queries) {
        console.log(`Executing: ${query}`);
        await client.query(query);
      }
      console.log('Migration completed successfully!');
      await client.end();
      return;
    } catch (err: any) {
      console.error(`Failed connection/migration for ${config.host}:${config.port}:`, err.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

runMigrations();
