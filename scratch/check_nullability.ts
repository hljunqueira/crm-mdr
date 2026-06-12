import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'customers' });
  if (error) {
    // If RPC doesn't exist, let's try a direct SQL query or just check if we can insert a dummy customer with null/empty cpf.
    console.log('RPC get_table_info not found or failed, attempting to insert test customer with null cpf...');
    
    // Attempt insert with null cpf
    const { data: insertNullData, error: insertNullError } = await supabase
      .from('customers')
      .insert([{
        name: 'TESTE NULL CPF',
        phone: '11999999999',
        cpf: null,
        status: 'active'
      }])
      .select();
      
    if (insertNullError) {
      console.error('Failed to insert with null CPF:', insertNullError);
    } else {
      console.log('Successfully inserted with null CPF:', insertNullData);
      // Clean up
      await supabase.from('customers').delete().eq('id', insertNullData[0].id);
    }

    // Attempt insert with empty string cpf
    console.log('Attempting to insert test customer with empty string cpf...');
    const { data: insertEmptyData, error: insertEmptyError } = await supabase
      .from('customers')
      .insert([{
        name: 'TESTE EMPTY CPF',
        phone: '11999999999',
        cpf: '',
        status: 'active'
      }])
      .select();
      
    if (insertEmptyError) {
      console.error('Failed to insert with empty CPF:', insertEmptyError);
    } else {
      console.log('Successfully inserted with empty CPF:', insertEmptyData);
      // Clean up
      await supabase.from('customers').delete().eq('id', insertEmptyData[0].id);
    }

  } else {
    console.log('Table info:', data);
  }
}

check();
