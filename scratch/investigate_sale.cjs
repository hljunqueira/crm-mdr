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
  console.log('=== INVESTIGANDO VENDA LEANDRO CHAVES DE AZEVEDO E DISPOSITIVO REDMI 13C ===\n');

  // 1. Find customer Leandro Chaves de Azevedo
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*Leandro*Chaves*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  console.log('Cliente(s) encontrado(s):', JSON.stringify(customers, null, 2));

  // 2. Find Sales for Leandro
  let sales = [];
  if (customers.length > 0) {
    const custId = customers[0].id;
    const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${custId}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    sales = await salesRes.json();
  } else {
    // Search sales directly
    const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*&order=created_at.desc&limit=10`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    sales = await salesRes.json();
  }

  console.log('\nVenda(s) encontrada(s):', JSON.stringify(sales, null, 2));

  if (sales.length === 0) {
    console.log('Nenhuma venda encontrada.');
    return;
  }

  const targetSale = sales.find(s => s.id.toLowerCase().startsWith('4019b56a') || s.total_value == 3050.04) || sales[0];
  console.log('\nVenda Alvo:', JSON.stringify(targetSale, null, 2));

  // 3. Find Device linked to Sale
  if (targetSale.device_id) {
    const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${targetSale.device_id}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const devices = await devRes.json();
    console.log('\nDispositivo da Venda:', JSON.stringify(devices, null, 2));

    if (devices.length > 0) {
      const dev = devices[0];
      // If dev has investor_id, fetch investor profile
      if (dev.investor_id) {
        const invRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${dev.investor_id}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        console.log('\nPerfil do Investidor Direto:', JSON.stringify(await invRes.json(), null, 2));
      }
      // If dev has lot_id, fetch lot and lot investor quotas
      if (dev.lot_id) {
        const lotRes = await fetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${dev.lot_id}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        console.log('\nLote do Dispositivo:', JSON.stringify(await lotRes.json(), null, 2));

        const quotasRes = await fetch(`${SUPABASE_URL}/rest/v1/investor_quotas?lot_id=eq.${dev.lot_id}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        console.log('\nCotas de Investidores no Lote:', JSON.stringify(await quotasRes.json(), null, 2));
      }
    }
  }

  // Also search device by IMEI 862453085628905 or model REDMI 13C
  const imeiSearch = await fetch(`${SUPABASE_URL}/rest/v1/devices?or=(imei.ilike.*862453085628905*,serial_number.ilike.*862453085628905*,model.ilike.*REDMI*13C*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  console.log('\nBusca Direta do Dispositivo por IMEI/Modelo:', JSON.stringify(await imeiSearch.json(), null, 2));

  // 4. Fetch Installments for Sale
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?sale_id=eq.${targetSale.id}&order=installment_number.asc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();
  console.log('\nParcelas da Venda:', JSON.stringify(installments, null, 2));

  // 5. Fetch Wallet Transactions for this sale / installments
  if (installments.length > 0) {
    const instIds = installments.map(i => `installment_id.eq.${i.id}`).join(',');
    const txRes = await fetch(`${SUPABASE_URL}/rest/v1/wallet_transactions?or=(${instIds})`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    console.log('\nTransações na Carteira do Investidor:', JSON.stringify(await txRes.json(), null, 2));
  }

  // 6. Check receivable_purchases (Renda)
  const recRes = await fetch(`${SUPABASE_URL}/rest/v1/receivable_purchases?sale_id=eq.${targetSale.id}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  console.log('\nCompras de Recebíveis (Renda) para a Venda:', JSON.stringify(await recRes.json(), null, 2));
}

main().catch(err => console.error(err));
