import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Testing update customer...');
  
  // Find a customer
  const { data: customers, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .limit(1);

  if (fetchError || !customers || customers.length === 0) {
    console.error('Error fetching customer for test:', fetchError);
    return;
  }

  const customer = customers[0];
  console.log('Found customer:', customer.name, 'with ID:', customer.id);

  // Try updating approved_for_purchase and registration_status
  const updatedFields = {
    approved_for_purchase: !customer.approved_for_purchase,
    registration_status: customer.registration_status === 'APROVADO' ? 'PRE_CADASTRO' : 'APROVADO'
  };

  console.log('Updating with fields:', updatedFields);

  const { data: updatedCustomer, error: updateError } = await supabase
    .from('customers')
    .update(updatedFields)
    .eq('id', customer.id)
    .select();

  if (updateError) {
    console.error('Error updating customer:', updateError);
  } else {
    console.log('Success updating customer:', updatedCustomer);
    
    // Revert the changes
    const revertFields = {
      approved_for_purchase: customer.approved_for_purchase,
      registration_status: customer.registration_status
    };
    await supabase.from('customers').update(revertFields).eq('id', customer.id);
    console.log('Reverted changes successfully.');
  }
}

run();
