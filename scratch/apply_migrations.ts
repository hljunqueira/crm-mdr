import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// We will try to run SQL migrations using pg client.
const queries = [
  `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;`,
  `ALTER TABLE sales ADD CONSTRAINT sales_payment_type_check CHECK (payment_type IN ('crediario', 'card', 'vista', 'debit'));`,
  `ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT;`,
  `ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE CASCADE;`,
  `ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;`,
  `ALTER TABLE devices ADD CONSTRAINT devices_status_check CHECK (status IN ('available', 'sold', 'reserved', 'in_repair', 'pending_valuation'));`
];

async function runMigrations() {
  // Try local first, then external
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
      host: 'localhost',
      port: 6543,
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
      console.log('All migrations completed successfully!');
      await client.end();
      return;
    } catch (err: any) {
      console.error(`Failed connection/migration for ${config.host}:${config.port}:`, err.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }
  
  console.error('All connection attempts failed. Please run the SQL manually in Supabase SQL Editor:');
  console.log(queries.join('\n'));
}

runMigrations();
