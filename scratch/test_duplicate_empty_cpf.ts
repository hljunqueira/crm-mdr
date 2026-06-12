import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Inserting first customer with empty CPF...');
  const { data: data1, error: error1 } = await supabase
    .from('customers')
    .insert([{
      name: 'TESTE DUPLICADO 1',
      phone: '11999999999',
      cpf: '',
      status: 'active'
    }])
    .select();

  if (error1) {
    console.error('Error inserting first customer:', error1);
    return;
  }
  console.log('Inserted customer 1:', data1[0].id);

  console.log('Inserting second customer with empty CPF...');
  const { data: data2, error: error2 } = await supabase
    .from('customers')
    .insert([{
      name: 'TESTE DUPLICADO 2',
      phone: '11999999999',
      cpf: '',
      status: 'active'
    }])
    .select();

  if (error2) {
    console.error('Error inserting second customer (this indicates a UNIQUE index on CPF):', error2);
  } else {
    console.log('Inserted customer 2 successfully:', data2[0].id);
    // Clean up customer 2
    await supabase.from('customers').delete().eq('id', data2[0].id);
  }

  // Clean up customer 1
  await supabase.from('customers').delete().eq('id', data1[0].id);
}

check();
