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
  console.log('=== INVESTIGANDO VENDAS DE FINANCIAMENTO (CONTRATOS) ===\n');

  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?origin_type=eq.FINANCIAMENTO_CELULAR&select=*,customers(name,cpf)&order=created_at.desc&limit=10`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log(`Encontradas ${sales.length} vendas de financiamento:`);
  sales.forEach(s => {
    console.log(`Venda ID: ${s.id.slice(0,8)} | Cliente: ${s.customers?.name}`);
    console.log(`  Modelo: ${s.device_model_manual || s.device_id}`);
    console.log(`  Valor Total: R$ ${s.total_value} | Preço À Vista/Original: R$ ${s.original_price} | Entrada: R$ ${s.down_payment}`);
    console.log(`  Parcelas: ${s.installments_count} | Data Venda: ${s.sale_date} | Store: ${s.store_id}`);
    console.log(`  repassed_at: ${s.repassed_at || 'Não repassado'}`);
    console.log('--------------------------------------------------');
  });
}

main().catch(err => console.error(err));
