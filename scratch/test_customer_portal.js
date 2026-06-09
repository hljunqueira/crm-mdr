import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('--- Testing Customer Portal RLS Integration ---');
  console.log('Using Supabase URL:', supabaseUrl);
  
  // Test CPF for Alex
  const cpf = '025.668.998-87';
  const cleanCpf = cpf.replace(/\D/g, '');
  
  console.log(`\n1. Querying customer by CPF: ${cpf}...`);
  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .select('id, name')
    .or(`cpf.eq.${cpf},cpf.eq.${cleanCpf}`)
    .maybeSingle();

  if (customerErr) {
    console.error('❌ Error fetching customer:', customerErr);
    return;
  }
  
  if (!customer) {
    console.error('❌ Customer not found!');
    return;
  }

  console.log('✅ Customer found successfully:', customer);

  console.log(`\n2. Querying service orders for customer_id: ${customer.id}...`);
  const { data: orders, error: ordersErr } = await supabase
    .from('service_orders')
    .select('*')
    .eq('customer_id', customer.id);

  if (ordersErr) {
    console.error('❌ Error fetching service orders:', ordersErr);
    return;
  }

  console.log('✅ Service orders fetched successfully. Count:', orders?.length);
  if (orders && orders.length > 0) {
    orders.forEach(os => {
      console.log(`- OS #${os.os_number} | Device: ${os.device_brand} ${os.device_model} | Status: ${os.status}`);
    });
  } else {
    console.log('No service orders found.');
  }

  console.log('\n--- Test Completed ---');
}

run();
