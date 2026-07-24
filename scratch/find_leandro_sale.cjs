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
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*,customers(*),devices(*)&order=created_at.desc&limit=50`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log(`Fetched ${sales.length} sales.`);
  for (const s of sales) {
    console.log(`Sale ID: ${s.id} | Date: ${s.sale_date} | Total: R$ ${s.total_value} | Customer: ${s.customers?.name} | Device: ${s.devices?.model || s.device_model_manual}`);
  }
}

main().catch(err => console.error(err));
