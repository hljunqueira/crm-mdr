import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const dummyInstallment = {
    sale_id: '9d8c4c5a-4ef0-4600-b0f5-e227108293fd',
    customer_id: '68558c49-3994-4379-8e5f-be1fb9e07153',
    installment_number: 1,
    total_installments: 12,
    value: 131.25,
    due_date: '2026-06-15',
    status: 'pending'
  };
  
  console.log('Testing inserting an installment with customer_id...');
  const { data: insData, error: insError } = await supabase
    .from('installments')
    .insert([dummyInstallment])
    .select();
    
  if (insError) {
    console.error('Insert Error:', insError);
  } else {
    console.log('Insert Success! Created installment row:', insData);
    // Clean it up
    await supabase.from('installments').delete().eq('id', insData[0].id);
    console.log('Cleaned up the test installment.');
  }
}

run();
