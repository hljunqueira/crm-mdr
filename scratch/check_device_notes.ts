import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', '73f25ca0-2a9c-4d12-bb20-1d149fbaa837')
    .single();

  console.log('Sale details:', JSON.stringify(sale, null, 2));
}

main();
