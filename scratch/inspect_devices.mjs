import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDevicesAndSales() {
  // Check device locks
  const { data: locks } = await supabase.from('device_locks').select('sale_id, device_id');
  console.log(`Total device_locks: ${locks ? locks.length : 0}`);
  const lockedSaleIds = new Set((locks || []).map(l => l.sale_id));

  // Check sales
  const { data: sales } = await supabase.from('sales').select('*, devices(category, brand, model)');

  let celSales = [];
  let lojaSales = [];

  sales.forEach(s => {
    const isCelularCategory = s.devices?.category === 'smartphone' || s.devices?.category === 'celular';
    const hasValidImei = s.imei_manual && s.imei_manual.trim() !== '' && s.imei_manual.trim() !== '0000000' && s.imei_manual.toUpperCase() !== 'N/A';
    const isLocked = lockedSaleIds.has(s.id);
    const modelLower = (s.device_model_manual || s.devices?.model || '').toLowerCase();
    const isCellModel = modelLower.includes('celular') || modelLower.includes('iphone') || modelLower.includes('galaxy') || modelLower.includes('xiaomi') || modelLower.includes('poco') || modelLower.includes('redmi') || modelLower.includes('samsung') || modelLower.includes('motorola') || modelLower.includes('moto');

    const isFinanciamentoCelular = isLocked || isCelularCategory || hasValidImei || (s.payment_type === 'crediario' && isCellModel);

    if (isFinanciamentoCelular) {
      celSales.push({
        id: s.id,
        model: s.device_model_manual,
        imei: s.imei_manual,
        payment_type: s.payment_type,
        category: s.devices?.category,
        isLocked
      });
    } else {
      lojaSales.push({
        id: s.id,
        model: s.device_model_manual,
        payment_type: s.payment_type
      });
    }
  });

  console.log(`Total Sales evaluated: ${sales.length}`);
  console.log(`Classified as FINANCIAMENTO_CELULAR: ${celSales.length}`);
  console.log(`Classified as CREDIARIO_LOJA: ${lojaSales.length}`);

  console.log('\n--- Sample FINANCIAMENTO_CELULAR Sales ---');
  console.log(celSales.slice(0, 15));

  console.log('\n--- Sample CREDIARIO_LOJA Sales ---');
  console.log(lojaSales.slice(0, 10));
}

inspectDevicesAndSales();
