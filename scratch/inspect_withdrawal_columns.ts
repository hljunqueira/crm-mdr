import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabaseClient.from('wallet_transactions').select('*').limit(1);
  if (error) {
    console.error('Error fetching wallet_transactions:', error);
  } else {
    console.log('wallet_transactions columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data');
  }
}
check();
