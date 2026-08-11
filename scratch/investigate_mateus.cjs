const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envConfig.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

async function main() {
  console.log('=== INVESTIGANDO MATEUS OLIVEIRA BRITO ===\n');

  // 1. Customer
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*Mateus*&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  console.log('Clientes encontrados com nome Mateus:', customers);

  for (const c of customers) {
    const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${c.id}&select=*,installments(*)`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const sales = await salesRes.json();
    console.log(`\nVendas do cliente ${c.name} (${c.id}):`, JSON.stringify(sales, null, 2));
  }
}

main().catch(err => console.error(err));
