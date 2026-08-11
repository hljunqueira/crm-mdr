import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data: paidInstallments, error: instErr } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, payment_method, payment_date, created_at, transfer_id, installment_number, total_installments, sales(id, origin_type, store_id, down_payment, payment_type, payment_method, customer_id, customers(id, name, cpf))')
    .or('status.eq.paid,status.eq.pago,payment_date.not.is.null');

  if (instErr) {
    console.error('SUPABASE QUERY ERROR:', instErr);
    return;
  }

  const alex = (paidInstallments || []).find((i: any) => (i.sales?.customers?.name || '').toLowerCase().includes('alex hartmann')) as any;

  if (alex) {
    console.log('Alex Hartmann record:', alex.id, alex.value, alex.sales?.down_payment);
  }
}

testQuery();
