import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: saleData } = await supabase.from('sales').select('*').limit(1);
  const { data: osData } = await supabase.from('service_orders').select('*').limit(1);
  
  console.log('Sale columns:', saleData && saleData.length > 0 ? Object.keys(saleData[0]) : 'No data');
  console.log('OS columns:', osData && osData.length > 0 ? Object.keys(osData[0]) : 'No data');
}

check();
