const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envPath = '/app/.env';
let envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envConfig[key] = val;
    }
  });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined');

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: customers, error: cErr } = await supabase.from('customers').select('*');
  const { data: sales, error: sErr } = await supabase.from('sales').select('*');
  console.log('Customers from Supabase:', customers ? customers.length : 0, 'Error:', cErr);
  console.log('Sales from Supabase:', sales ? sales.length : 0, 'Error:', sErr);
}

run();
