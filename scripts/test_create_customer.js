import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Testing create customer...');
  
  // Try inserting a customer with unit_id to see if it fails
  const testCustomer = {
    name: 'Test Customer ' + Date.now(),
    cpf: '123.456.789-' + Math.floor(10 + Math.random() * 90),
    phone: '(48) 99999-9999',
    address: 'Street Test',
    classification: 'MEDIO',
    credit_limit: 1000,
    credit_status: 'EM_ANALISE',
    approved_for_purchase: false,
    registration_status: 'PRE_CADASTRO',
    unit_id: 'some-unit-id' // Let's see if this fails
  };

  const { data, error } = await supabase
    .from('customers')
    .insert([testCustomer])
    .select();

  if (error) {
    console.error('Error inserting with unit_id:', error);
  } else {
    console.log('Success inserting with unit_id:', data);
  }

  // Try inserting without unit_id
  const testCustomerOk = { ...testCustomer };
  delete testCustomerOk.unit_id;
  
  const { data: data2, error: error2 } = await supabase
    .from('customers')
    .insert([testCustomerOk])
    .select();

  if (error2) {
    console.error('Error inserting without unit_id:', error2);
  } else {
    console.log('Success inserting without unit_id:', data2);
    // clean it up
    if (data2 && data2[0]) {
      await supabase.from('customers').delete().eq('id', data2[0].id);
      console.log('Cleaned up test customer.');
    }
  }
}

run();
