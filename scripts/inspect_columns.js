import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Querying schema of installments table...');
  
  // We can select one row from information_schema.columns
  const { data: cols, error } = await supabase
    .rpc('get_table_columns', { table_name_param: 'installments' }); // Wait, if RPC doesn't exist, we can use a direct SQL via REST, but REST doesn't support raw SQL unless we use a RPC function.
    
  if (error) {
    console.log('RPC get_table_columns failed, attempting to do a dummy insert to see columns or reading error message...');
  }
  
  // Alternatively, let's try to insert a row with an empty object and see the Postgres error message which list columns,
  // or insert a valid row but with some random keys to see which ones fail.
  const dummyInstallment = {
    sale_id: '9d8c4c5a-4ef0-4600-b0f5-e227108293fd',
    installment_number: 1,
    total_installments: 12,
    value: 131.25,
    due_date: '2026-06-15',
    status: 'pending'
  };
  
  console.log('Testing inserting a single installment...');
  const { data: insData, error: insError } = await supabase
    .from('installments')
    .insert([dummyInstallment])
    .select();
    
  if (insError) {
    console.error('Insert Error:', insError);
  } else {
    console.log('Insert Success! Created installment row:', insData);
    // Let's print all its keys!
    if (insData && insData[0]) {
      console.log('Installment columns:', Object.keys(insData[0]));
      // Clean it up
      await supabase.from('installments').delete().eq('id', insData[0].id);
      console.log('Cleaned up the test installment.');
    }
  }
}

run();
