import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: inst } = await supabase.from('installments').select('id, sale_id').limit(1).single();
  if (!inst) {
    console.log('No installment found');
    return;
  }
  
  console.log('Testing query on installment ID:', inst.id);
  const { data, error } = await supabase
    .from("installments")
    .select(`
      id,
      installment_number,
      sales (
        id,
        device_id,
        installments_count,
        total_value,
        customers (
          id,
          name
        )
      )
    `)
    .eq("id", inst.id)
    .single();

  if (error) {
    console.error('Query Failed with Error:', error);
  } else {
    console.log('Query Succeeded:', data);
  }
}

run();
