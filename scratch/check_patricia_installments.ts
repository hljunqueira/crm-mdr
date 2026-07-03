import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select('id, customer_id, customers(name)')
    .eq('customer_id', '272c6446-a095-4792-bf50-736118decc2e');

  if (sErr) {
    console.error('Sales error:', sErr);
    return;
  }

  console.log('Patricia sales:', sales);

  if (sales && sales.length > 0) {
    const saleIds = sales.map(s => s.id);
    const { data: installments, error: iErr } = await supabase
      .from('installments')
      .select('id, installment_number, status, payment_date, value, sale_id')
      .in('sale_id', saleIds);

    if (iErr) {
      console.error('Installments error:', iErr);
      return;
    }

    console.log('Patricia installments:', installments);
  }
}

run();
