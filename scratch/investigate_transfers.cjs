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
  console.log('=== INVESTIGANDO REPASSES REALIZADOS SEM UNIDADE DEFINIDA ===\n');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cashier_transfers?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const transfers = await res.json();
  if (Array.isArray(transfers)) {
    console.log(`Total de repasses em cashier_transfers: ${transfers.length}`);

    const nullStoreTransfers = transfers.filter(t => !t.store_id || !t.destination_store_id);
    console.log(`Repasses com loja_id nula (sem destino): ${nullStoreTransfers.length}\n`);

    nullStoreTransfers.forEach(t => {
      console.log(`Repasse ID: ${t.id} | Valor: R$ ${t.amount} | Data: ${t.created_at}`);
      console.log(`  Desc: ${t.description}`);
      console.log('--------------------------------------------------');
    });
  } else {
    console.log('cashier_transfers response:', JSON.stringify(transfers, null, 2));
  }

  // Check cash_transactions with cashier_type LOJA and null unit_id
  const txRes = await fetch(`${SUPABASE_URL}/rest/v1/cash_transactions?unit_id=is.null&select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const nullUnitTxs = await txRes.json();
  if (Array.isArray(nullUnitTxs)) {
    console.log(`\nTransações no caixa com unit_id nulo: ${nullUnitTxs.length}`);
    nullUnitTxs.forEach(t => {
      console.log(`  Tx ID: ${t.id} | Tipo: ${t.type} | Valor: R$ ${t.amount} | Cashier: ${t.cashier_type} | Desc: ${t.description}`);
    });
  } else {
    console.log('cash_transactions response:', JSON.stringify(nullUnitTxs, null, 2));
  }
}

main().catch(err => console.error(err));
