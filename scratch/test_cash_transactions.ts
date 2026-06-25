import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: txs, error: err } = await supabase
    .from('cash_transactions')
    .select('*')
    .limit(5);

  if (err) {
    console.error('Error fetching cash_transactions:', err);
    return;
  }
  console.log('Columns in cash_transactions:', Object.keys(txs[0] || {}));
}

run();
