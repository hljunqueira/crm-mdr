import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixSales() {
  console.log('=== FIXING ALEX HARTMANN & SMARTPHONE SALES ORIGIN TYPE ===');

  // 1. Specifically fix Alex Hartmann sale
  const { data: alexSales } = await supabase
    .from('sales')
    .select('id, device_model_manual, origin_type, customers!inner(name)')
    .ilike('customers.name', '%ALEX HARTMANN%');

  console.log('Alex Hartmann sales found:', alexSales);

  if (alexSales && alexSales.length > 0) {
    for (const sale of alexSales) {
      console.log(`Updating sale ${sale.id} to FINANCIAMENTO_CELULAR...`);
      const { error: saleErr } = await supabase
        .from('sales')
        .update({ origin_type: 'FINANCIAMENTO_CELULAR' })
        .eq('id', sale.id);
      
      if (saleErr) console.error('Error updating sale:', saleErr);

      console.log(`Updating installments for sale ${sale.id}...`);
      const { error: instErr } = await supabase
        .from('installments')
        .update({ origin_type: 'FINANCIAMENTO_CELULAR' })
        .eq('sale_id', sale.id);

      if (instErr) console.error('Error updating installments:', instErr);
    }
  }

  // 2. Perform a general sweep for any smartphone sales that are still marked as CREDIARIO_LOJA
  const { data: allSales } = await supabase
    .from('sales')
    .select('id, device_model_manual, imei_manual, origin_type, device_id, devices(category, brand, model)')
    .eq('origin_type', 'CREDIARIO_LOJA');

  const cellSaleIds: string[] = [];

  (allSales || []).forEach((s: any) => {
    const dev = Array.isArray(s.devices) ? s.devices[0] : s.devices;
    const isCelularCategory = dev?.category === 'smartphone' || dev?.category === 'celular';
    const hasValidImei = s.imei_manual && s.imei_manual.trim() !== '' && s.imei_manual.trim() !== '0000000' && s.imei_manual.toUpperCase() !== 'N/A';
    const modelLower = (s.device_model_manual || dev?.model || '').toLowerCase();
    const isCellKeywords = modelLower.includes('celular') || 
                           modelLower.includes('iphone') || 
                           modelLower.includes('galaxy') || 
                           modelLower.includes('xiaomi') || 
                           modelLower.includes('poco') || 
                           modelLower.includes('redmi') || 
                           modelLower.includes('samsung') || 
                           modelLower.includes('motorola') || 
                           modelLower.includes('moto');

    if (isCelularCategory || hasValidImei || isCellKeywords) {
      cellSaleIds.push(s.id);
    }
  });

  console.log(`Additional smartphone sales found with CREDIARIO_LOJA: ${cellSaleIds.length}`);

  if (cellSaleIds.length > 0) {
    await supabase.from('sales').update({ origin_type: 'FINANCIAMENTO_CELULAR' }).in('id', cellSaleIds);
    await supabase.from('installments').update({ origin_type: 'FINANCIAMENTO_CELULAR' }).in('sale_id', cellSaleIds);
    console.log('✅ Additional smartphone sales reclassified to FINANCIAMENTO_CELULAR!');
  }

  console.log('=== FIX COMPLETE ===');
}

fixSales();
