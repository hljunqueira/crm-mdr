import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's search for cash transactions with description matching 'MAYKON DA ROSA'
  const { data: txs, error: err } = await supabase
    .from('cash_transactions')
    .select('*')
    .ilike('description', '%MAYKON DA ROSA%');

  if (err) {
    console.error('Error fetching cash_transactions:', err);
    return;
  }

  console.log(`Found ${txs.length} transactions:`);
  for (const tx of txs) {
    console.log(`ID: ${tx.id} | Date: ${tx.created_at} | Description: ${tx.description} | Value: ${tx.amount} | Type: ${tx.type}`);
  }

  if (txs.length > 0) {
    const ids = txs.map(t => t.id);
    console.log('Deleting these transactions...');
    const { error: delErr } = await supabase
      .from('cash_transactions')
      .delete()
      .in('id', ids);
    
    if (delErr) {
      console.error('Error deleting transactions:', delErr);
    } else {
      console.log('Successfully deleted transactions.');
    }
  } else {
    console.log('No transactions found to delete.');
  }
}

run();
