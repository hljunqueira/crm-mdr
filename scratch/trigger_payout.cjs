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
  const instId = 'beae0530-e7ad-4491-ba51-c35e80469ee9';
  console.log(`Checking installment ${instId}...`);

  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?id=eq.${instId}&select=*,sales(*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const inst = await instRes.json();
  console.log('Installment in Supabase:', JSON.stringify(inst, null, 2));
}

main().catch(err => console.error(err));
