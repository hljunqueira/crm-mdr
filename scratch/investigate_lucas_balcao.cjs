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
  console.log('=== INVESTIGANDO LUCAS DA SILVA SENA E CLIENTE BALCAO ===\n');

  // Lucas
  const lucasRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*,customers(name),installments(*)&or=(device_model_manual.ilike.*IPHONE*,customers.name.ilike.*Lucas*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const lucasSales = await lucasRes.json();
  console.log('Vendas encontradas para Lucas / iPhone:', JSON.stringify(lucasSales, null, 2));

  // Cliente Balcao sales in installments
  const balcaoRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?select=*,sales(id,origin_type,down_payment,total_value,payment_type,device_model_manual,customers(name))&sales.customers.name=ilike.*balcao*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const balcaoInsts = await balcaoRes.json();
  console.log('\nParcelas de Cliente Balcão:', JSON.stringify(balcaoInsts, null, 2));
}

main().catch(err => console.error(err));
