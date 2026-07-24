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
  console.log('=== EXECUTANDO MIGRAÇÃO E PATCH DE APARELHOS VENDIDOS NO SUPABASE ===\n');

  // 1. Fetch sales that have a device_id or imei_manual
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=*,devices(*),customers(name)&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log(`Total de vendas analisadas: ${sales.length}`);

  let updatedCount = 0;

  for (const s of sales) {
    // A) If sale has device_id and device is not marked as sold
    if (s.device_id) {
      const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${s.device_id}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const devs = await devRes.json();
      if (devs.length > 0) {
        const dev = devs[0];
        if (dev.status !== 'sold' || dev.stock_quantity > 0) {
          console.log(`[PATCH] Atualizando dispositivo ${dev.id} (${dev.model || dev.short_name} - IMEI ${dev.imei}) da venda ${s.id} (${s.customers?.name})...`);
          
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${dev.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'sold',
              stock_quantity: 0,
              updated_at: new Date().toISOString()
            })
          });

          if (patchRes.ok) {
            console.log(`  -> Dispositivo ${dev.id} atualizado para status='sold' e stock_quantity=0 com sucesso.`);
            updatedCount++;
          } else {
            console.error(`  -> Falha ao atualizar dispositivo ${dev.id}:`, await patchRes.text());
          }
        }
      }
    }

    // B) If sale has imei_manual, update device with matching imei if available
    const imeiStr = (s.imei_manual || '').trim();
    if (imeiStr && imeiStr.toUpperCase() !== 'N/A' && imeiStr !== '0000000') {
      const imeis = imeiStr.split(',').map(i => i.trim()).filter(Boolean);
      for (const imei of imeis) {
        const devRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?imei=eq.${imei}`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const devs = await devRes.json();
        for (const dev of devs) {
          if (dev.status !== 'sold' || dev.stock_quantity > 0) {
            console.log(`[PATCH BY IMEI] Atualizando dispositivo ${dev.id} (IMEI ${imei}) da venda ${s.id}...`);
            await fetch(`${SUPABASE_URL}/rest/v1/devices?id=eq.${dev.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: 'sold',
                stock_quantity: 0,
                updated_at: new Date().toISOString()
              })
            });
            updatedCount++;
          }
        }
      }
    }
  }

  console.log(`\n=== MIGRAÇÃO CONCLUÍDA: ${updatedCount} dispositivos corrigidos no Supabase ===`);
}

main().catch(err => console.error(err));
