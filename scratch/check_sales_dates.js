import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching stores...');
  const { data: stores } = await supabase.from('stores').select('id, name');
  console.log('Stores:', stores);

  console.log('\nFetching sales...');
  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, store_id, total_value, sale_date, created_at')
    .order('sale_date', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  sales.forEach(s => {
    const store = stores.find(st => st.id === s.store_id);
    console.log(`Store: ${store ? store.name : s.store_id} | Date: ${s.sale_date} | Created At: ${s.created_at} | Value: ${s.total_value}`);
  });
}

run();
