import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log('Searching for Henrique Linhares Junqueira...');
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%Henrique Linhares junqueira%');

  if (error) {
    console.error('Error finding customer:', error);
    return;
  }

  if (customers && customers.length > 0) {
    const customer = customers[0];
    console.log('Customer Name:', customer.name);
    console.log('Customer Phone:', customer.phone);
    console.log('Customer Id:', customer.id);
    
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select('id, installment_number, total_installments, value, due_date, status, asaas_payment_id, sales!inner(customer_id)')
      .eq('sales.customer_id', customer.id)
      .eq('status', 'pending');

    if (instError) {
      console.error('Error finding installments:', instError);
    } else {
      console.log('Pending Installments count:', installments?.length);
      console.log('Pending Installments (first 3):', installments?.slice(0, 3));
    }
  } else {
    console.log('Customer not found');
  }
}

check().catch(console.error);
