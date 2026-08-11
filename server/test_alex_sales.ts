import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAlexSales() {
  const { data: paidInstallments, error } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, payment_method, payment_date, created_at, installment_number, total_installments, sales(id, origin_type, store_id, down_payment, payment_type, payment_method, customer_id, customers(id, name, cpf))');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(`Total installments fetched: ${paidInstallments?.length}`);

  const alex = (paidInstallments || []).find((i: any) => {
    const s = Array.isArray(i.sales) ? i.sales[0] : i.sales;
    const custs = s?.customers;
    const cust = Array.isArray(custs) ? custs[0] : custs;
    return (cust?.name || '').toLowerCase().includes('alex hartmann');
  });

  console.log('Alex Record:', JSON.stringify(alex, null, 2));
}

testAlexSales();
