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
  // Fetch recent sales
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*&order=created_at.desc&limit=10`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  const targetSale = sales.find(s => s.id.toLowerCase().startsWith('4019b56a')) || sales.find(s => s.total_value == 3050.04);
  console.log('TARGET SALE:', JSON.stringify(targetSale, null, 2));

  if (!targetSale) return;

  // Device by sale.device_id
  if (targetSale.device_id) {
    const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${targetSale.device_id}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const devs = await devRes.json();
    console.log('DEVICE LINKED TO SALE:', JSON.stringify(devs, null, 2));

    if (devs.length > 0) {
      const dev = devs[0];
      if (dev.investor_id) {
        const invRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${dev.investor_id}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        console.log('INVESTOR PROFILE:', JSON.stringify(await invRes.json(), null, 2));
      }
      if (dev.lot_id) {
        const lotRes = await fetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${dev.lot_id}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        console.log('LOT:', JSON.stringify(await lotRes.json(), null, 2));
      }
    }
  }

  // Also query all devices
  const allDevsRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const allDevs = await allDevsRes.json();
  console.log(`Total devices in database: ${allDevs.length}`);
  const redmiDevs = allDevs.filter(d => (d.model && d.model.toUpperCase().includes('REDMI')) || (d.short_name && d.short_name.toUpperCase().includes('REDMI')) || (d.imei && d.imei.includes('862453085628905')));
  console.log('ALL REDMI DEVICES IN DB:', JSON.stringify(redmiDevs, null, 2));
}

main().catch(err => console.error(err));
