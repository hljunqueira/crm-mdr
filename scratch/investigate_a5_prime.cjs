const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== BUSCANDO IMEI 860993083018221 NO SUPABASE ===");

  // 1. Dispositivo
  const { data: dev } = await supabase.from('devices').select('*').eq('imei', '860993083018221');
  console.log("Device:", dev);

  // 2. Prime Device Link
  const { data: primeDevs } = await supabase.from('investor_prime_devices').select('*, investor:investors(name, email), device:devices(*)');
  console.log("\nTodos os Investor Prime Devices (count: " + (primeDevs ? primeDevs.length : 0) + "):");
  (primeDevs || []).forEach(p => {
    console.log(`- ID: ${p.id} | Investor: ${p.investor?.name} | Device IMEI: ${p.device?.imei} | Model: ${p.device?.brand} ${p.device?.model} | Status: ${p.status} | Stock Qty: ${p.device?.stock_quantity}`);
  });

  // 3. Checar como a rota /api/scp/prime-devices faz a busca
  const { data: queryRes, error: qErr } = await supabase
    .from('investor_prime_devices')
    .select(`
      *,
      investor:investors(id, name, email),
      device:devices(id, brand, model, imei, sale_price, stock_quantity, status)
    `);

  console.log("\nQuery /api/scp/prime-devices result count:", queryRes?.length, "Error:", qErr);
  (queryRes || []).forEach(q => {
    console.log("Item:", q.id, "Device:", q.device?.brand, q.device?.model, "IMEI:", q.device?.imei, "StockQty:", q.device?.stock_quantity, "DeviceStatus:", q.device?.status, "PrimeStatus:", q.status);
  });
}

run().catch(console.error);
