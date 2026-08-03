import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data: insts, error } = await supabase
    .from('installments')
    .select('id, sale_id, installment_number, total_installments, value, status, origin_type, sales(device_model_manual, customer:customers(name))')
    .eq('origin_type', 'CREDIARIO_LOJA')
    .eq('status', 'paid');

  console.log('Paid CREDIARIO_LOJA installments count:', insts?.length);
  const totalPaid = insts?.reduce((acc, cur) => acc + Number(cur.value), 0) || 0;
  console.log('Total Paid for CREDIARIO_LOJA:', totalPaid);
  console.log('Details:', JSON.stringify(insts, null, 2));
}

run();
