import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data, error } = await supabase
    .from('receivable_purchases')
    .select('*')
    .limit(1);
    
  if (data && data.length > 0) {
    console.log('Columns in receivable_purchases:', Object.keys(data[0]));
  } else {
    console.log('No rows in receivable_purchases or error:', error);
  }
}
run();
