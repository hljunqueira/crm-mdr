import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's find sales that have cash transactions
  const { data: txs, error: err } = await supabase
    .from('cash_transactions')
    .select('sale_id, installment_id')
    .not('sale_id', 'is', null)
    .limit(10);

  if (err) {
    console.error('Error fetching cash_transactions:', err);
    return;
  }

  console.log('Cash transactions with sale_id:', txs);

  // Let's also check if there are any cash_transactions with installment_id set
  const { data: instTxs, error: err2 } = await supabase
    .from('cash_transactions')
    .select('installment_id')
    .not('installment_id', 'is', null)
    .limit(10);

  console.log('Cash transactions with installment_id:', instTxs);
}

run();
