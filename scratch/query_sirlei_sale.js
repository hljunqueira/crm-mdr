import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: customers, error: errCust } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%sirlei%');

  if (errCust) {
    console.error('Error finding customer:', errCust);
    return;
  }

  console.log('Customers found:', customers);

  if (!customers || customers.length === 0) {
    return;
  }

  for (const customer of customers) {
    const { data: sales, error: errSales } = await supabase
      .from('sales')
      .select('*, installments(*)')
      .eq('customer_id', customer.id);

    if (errSales) {
      console.error('Error finding sales:', errSales);
      continue;
    }

    console.log(`Sales for ${customer.name}:`);
    for (const sale of sales) {
      console.log('Sale ID:', sale.id);
      console.log('Total Value:', sale.total_value);
      console.log('Down Payment:', sale.down_payment);
      console.log('Installments Count:', sale.installments_count);
      console.log('Payment Type:', sale.payment_type);
      console.log('Sale Date:', sale.sale_date);
      console.log('Installments:');
      sale.installments.forEach(inst => {
        console.log(`  #${inst.installment_number}/${inst.total_installments}: value=${inst.value}, due=${inst.due_date}, status=${inst.status}`);
      });
    }
  }
}

run();
