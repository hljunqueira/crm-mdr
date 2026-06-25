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
    .eq('amount', 74.77);

  if (err) {
    console.error('Error fetching cash_transactions:', err);
    return;
  }

  console.log(`Found ${txs.length} transactions with value 74.77:`);
  for (const tx of txs) {
    console.log(`ID: ${tx.id} | Date: ${tx.created_at} | Description: ${tx.description} | Value: ${tx.amount} | Type: ${tx.type}`);
  }
}

run();
