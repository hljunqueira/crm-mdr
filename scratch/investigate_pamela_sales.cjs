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
  console.log('=== INVESTIGANDO VENDAS DE PAMELA, ANDILEINE E FRANCINE ===\n');

  const names = ['Pamela', 'Andileine', 'Francine'];
  for (const name of names) {
    const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*${name}*&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const customers = await custRes.json();

    if (customers.length > 0) {
      for (const c of customers) {
        const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${c.id}&select=*,devices(*),installments(*)`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const sales = await salesRes.json();
        console.log(`\nCustomer: ${c.name} (ID: ${c.id})`);
        console.log(`Sales count: ${sales.length}`);
        sales.forEach(s => {
          console.log(` Sale ID: ${s.id}`);
          console.log(`  device_model_manual: ${s.device_model_manual}`);
          console.log(`  original_price: ${s.original_price}`);
          console.log(`  total_value: ${s.total_value}`);
          console.log(`  down_payment: ${s.down_payment}`);
          console.log(`  origin_type: ${s.origin_type}`);
          console.log(`  repassed_at: ${s.repassed_at}`);
          console.log(`  device cost_price: ${s.devices?.cost_price}, sale_price: ${s.devices?.sale_price}`);
          console.log(`  installments count: ${s.installments?.length}`);
          if (s.installments && s.installments.length > 0) {
            console.log(`  first 3 insts:`, s.installments.slice(0, 3).map(i => ({ num: i.installment_number, val: i.value, status: i.status, repassed: i.repassed_at })));
          }
        });
      }
    }
  }
}

main().catch(err => console.error(err));
