import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPaidInstallments() {
  console.log('--- INSPECTION: ALL PAID INSTALLMENTS IN SUPABASE ---');

  const { data: insts, error } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, installment_number, total_installments, payment_date, sale_id, sales(id, origin_type, store_id, down_payment, customers(name))');

  if (error) {
    console.error('Error fetching installments:', error);
    return;
  }

  console.log(`Total installments in DB: ${insts?.length || 0}`);

  const paidList = (insts || []).filter((i: any) => i.status === 'paid' || i.status === 'pago' || i.payment_date !== null);

  console.log(`Paid installments total count: ${paidList.length}`);

  paidList.forEach((i: any) => {
    if ((i.sales?.customers?.name || '').toLowerCase().includes('alex')) {
      console.log('>>> FOUND ALEX:', JSON.stringify(i, null, 2));
    }
  });
}

inspectPaidInstallments();
