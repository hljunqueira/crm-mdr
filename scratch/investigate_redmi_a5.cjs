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
  console.log('=== INVESTIGANDO CELULAR REDMI A5 (IMEI 860993083018221) ===\n');

  // Query devices / inventory
  const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?imei=eq.860993083018221&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const devices = await devRes.json();
  console.log('Dispositivo(s) no estoque com este IMEI:', devices);

  // If not found by exact imei, query by model
  if (devices.length === 0) {
    const modelRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?model=ilike.*REDMI%20A5*&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const modelDevs = await modelRes.json();
    console.log('Dispositivos com modelo REDMI A5:', modelDevs);
  }

  // Query sales linked to this IMEI or model
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*,customers(name)&or=(imei_manual.eq.860993083018221,device_model_manual.ilike.*REDMI%20A5*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log('\nVenda(s) vinculadas a este aparelho/IMEI:', sales);
}

main().catch(err => console.error(err));
