import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: sale } = await supabase
    .from('sales')
    .select('*, installments(*)')
    .eq('id', 'de49f03c-12ae-4a17-91f1-5f75814d4f95')
    .single();

  console.log('Sale:', JSON.stringify(sale, null, 2));
}

run();
