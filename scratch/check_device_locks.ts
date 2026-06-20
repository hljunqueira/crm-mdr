import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .eq('device_id', 'a46fa223-e510-4187-b7b9-4c486da9ed82');

  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }

  console.log(`Found ${sales?.length || 0} sale(s) referencing POCO:`);
  console.log(JSON.stringify(sales, null, 2));
}

main();
