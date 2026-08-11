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
  console.log('=== ATUALIZANDO ORIGEM DA VENDA DE LUCAS DA SILVA SENA PARA FINANCIAMENTO_CELULAR ===\n');

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?id=eq.5bf1014f-1d53-48b6-bbf1-a186564aa2a6`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ origin_type: 'FINANCIAMENTO_CELULAR' })
  });

  const updated = await updateRes.json();
  console.log('Venda do Lucas atualizada com sucesso para FINANCIAMENTO_CELULAR:', updated);
}

main().catch(err => console.error(err));
