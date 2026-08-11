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
  console.log('=== ZERANDO ESTOQUE DO CELULAR REDMI A5 (IMEI 860993083018221) ===\n');

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.09b8c9a6-6278-4312-9abb-0dfe6ab5f449`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      stock_quantity: 0,
      status: 'sold'
    })
  });

  const updated = await updateRes.json();
  console.log('Dispositivo zerado e marcado como VENDIDO no estoque:', updated);
}

main().catch(err => console.error(err));
