import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSales() {
  console.log('--- Inspecting Supabase Sales ---');
  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, origin_type, device_id, device_model_manual, imei_manual, payment_type, created_at')
    .limit(2000);

  if (error) {
    console.error('Error fetching sales:', error.message);
    return;
  }

  let totalSales = sales.length;
  let celCount = 0;
  let lojaCount = 0;
  let nullCount = 0;
  let misclassifiedCel = [];

  sales.forEach(s => {
    if (!s.origin_type) {
      nullCount++;
    } else if (s.origin_type === 'FINANCIAMENTO_CELULAR') {
      celCount++;
    } else if (s.origin_type === 'CREDIARIO_LOJA') {
      lojaCount++;
      const hasDevice = Boolean(
        s.device_id || 
        (s.device_model_manual && 
         s.device_model_manual.trim() !== '' && 
         s.device_model_manual !== 'Geral' && 
         !s.device_model_manual.toLowerCase().includes('serviço') && 
         !s.device_model_manual.toLowerCase().includes('manutenção') &&
         !s.device_model_manual.toLowerCase().includes('balcão'))
      );
      if (hasDevice) {
        misclassifiedCel.push(s);
      }
    }
  });

  console.log(`Total Sales checked: ${totalSales}`);
  console.log(`FINANCIAMENTO_CELULAR: ${celCount}`);
  console.log(`CREDIARIO_LOJA: ${lojaCount}`);
  console.log(`NULL origin_type: ${nullCount}`);
  console.log(`Potentially misclassified sales (classified as CREDIARIO_LOJA but have device): ${misclassifiedCel.length}`);

  if (misclassifiedCel.length > 0) {
    console.log('Sample misclassified sales:', misclassifiedCel.slice(0, 10));
  }

  console.log('\n--- Inspecting Supabase Installments ---');
  const { data: insts, error: instErr } = await supabase
    .from('installments')
    .select('id, origin_type, sale_id')
    .limit(2000);

  if (instErr) {
    console.error('Error fetching installments:', instErr.message);
    return;
  }

  let instCel = 0;
  let instLoja = 0;
  let instNull = 0;

  insts.forEach(i => {
    if (!i.origin_type) instNull++;
    else if (i.origin_type === 'FINANCIAMENTO_CELULAR') instCel++;
    else if (i.origin_type === 'CREDIARIO_LOJA') instLoja++;
  });

  console.log(`Total Installments checked: ${insts.length}`);
  console.log(`Installments FINANCIAMENTO_CELULAR: ${instCel}`);
  console.log(`Installments CREDIARIO_LOJA: ${instLoja}`);
  console.log(`Installments NULL: ${instNull}`);
}

checkSales();
