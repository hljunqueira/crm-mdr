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
  console.log('=== AUDITORIA COMPLETA DE VENDAS X ESTOQUE X INVESTIDORES ===\n');

  // 1. Fetch all sales with device_id or imei_manual
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*,devices(*),customers(name)&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log(`Total de vendas no banco: ${sales.length}`);

  const discrepancies = [];

  for (const s of sales) {
    // Check if sale has device_id
    if (s.device_id) {
      const dev = s.devices;
      if (dev && dev.status !== 'sold') {
        discrepancies.push({
          type: 'DIRECT_DEVICE_ID_NOT_SOLD',
          sale_id: s.id,
          sale_date: s.sale_date,
          customer_name: s.customers?.name,
          device_id: dev.id,
          model: dev.model || dev.short_name,
          imei: dev.imei,
          current_device_status: dev.status,
          stock_quantity: dev.stock_quantity,
          investor_id: dev.investor_id,
          lot_id: dev.lot_id
        });
      }
    }

    // Check if sale has imei_manual that matches an available device
    const imeiStr = (s.imei_manual || '').trim();
    if (imeiStr && imeiStr.toUpperCase() !== 'N/A' && imeiStr !== '0000000') {
      const imeis = imeiStr.split(',').map(i => i.trim()).filter(Boolean);
      for (const imei of imeis) {
        const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?imei=eq.${imei}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const devs = await devRes.json();
        for (const dev of devs) {
          if (dev.status !== 'sold' && dev.id !== s.device_id) {
            discrepancies.push({
              type: 'IMEI_MATCH_NOT_SOLD',
              sale_id: s.id,
              sale_date: s.sale_date,
              customer_name: s.customers?.name,
              device_id: dev.id,
              model: dev.model || dev.short_name,
              imei: dev.imei,
              current_device_status: dev.status,
              stock_quantity: dev.stock_quantity,
              investor_id: dev.investor_id,
              lot_id: dev.lot_id
            });
          }
        }
      }
    }
  }

  console.log(`\nDiscrepâncias Encontradas (Vendas com Aparelho NÃO Marcado como 'sold'): ${discrepancies.length}`);
  console.log(JSON.stringify(discrepancies, null, 2));

  // 2. Check devices with investor_id or lot_id that have stock_quantity > 1 or status 'available' but were sold
  console.log('\n--- VERIFICANDO DISPOSITIVOS DE INVESTIDORES ---');
  const invDevsRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?or=(investor_id.not.is.null,lot_id.not.is.null)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const invDevs = await invDevsRes.json();
  console.log(`Total de dispositivos vinculados a investidores: ${invDevs.length}`);

  const problematicInvDevs = [];
  for (const d of invDevs) {
    if (d.stock_quantity > 1) {
      problematicInvDevs.push({
        reason: 'INVESTOR_DEVICE_MULTIPLE_STOCK',
        device_id: d.id,
        model: d.model || d.short_name,
        imei: d.imei,
        stock_quantity: d.stock_quantity,
        status: d.status,
        investor_id: d.investor_id,
        lot_id: d.lot_id
      });
    }
  }
  console.log(`Dispositivos de investidores com estoque > 1: ${problematicInvDevs.length}`);
  console.log(JSON.stringify(problematicInvDevs, null, 2));
}

main().catch(err => console.error(err));
