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
  console.log('=== NORMALIZANDO A ORIGEM DAS PARCELAS DE MATEUS OLIVEIRA BRITO ===\n');

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?sale_id=eq.002883ec-ced4-4008-a4dd-5c71905ebad8`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ origin_type: 'CREDIARIO_LOJA' })
  });

  const updated = await updateRes.json();
  console.log('Parcelas atualizadas com sucesso para CREDIARIO_LOJA:', updated);
}

main().catch(err => console.error(err));
