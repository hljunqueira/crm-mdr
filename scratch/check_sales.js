import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: sales } = await supabase.from('sales').select('*, customers(name)');
  console.log('Total sales:', sales?.length);
  console.log('Sample sales:', sales?.map(s => ({
    id: s.id,
    store_id: s.store_id,
    device_model: s.device_model_manual,
    total_value: s.total_value,
    customer_name: s.customers?.name
  })));
  
  const { data: units } = await supabase.from('stores').select('*');
  console.log('Units:', units);
}

run();
