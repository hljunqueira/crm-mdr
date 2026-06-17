import { Client } from 'pg';

const queries = [
  `ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;`,
  `ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;`,
  `ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_sync_status TEXT DEFAULT 'synced';`,
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;`,
  `CREATE INDEX IF NOT EXISTS idx_installments_asaas_payment_id ON installments(asaas_payment_id);`
];

async function runAsaasMigrations() {
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
  
  console.log('\n--- MANUAL SQL EXECUTION REQUIRED ---');
  console.log('If the automated script failed, please execute the following SQL in your Supabase SQL Editor:');
  console.log(queries.join('\n'));
}

runAsaasMigrations();
