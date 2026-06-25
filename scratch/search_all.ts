import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: txs, error: err } = await supabase
    .from('cash_transactions')
    .select('*');

  if (err) {
    console.error('Error fetching cash_transactions:', err);
    return;
  }

  console.log(`Total cash_transactions: ${txs.length}`);
  const matching = txs.filter(t => t.description && t.description.toLowerCase().includes('maykon'));
  console.log(`Matching: ${matching.length}`);
  for (const m of matching) {
    console.log(`ID: ${m.id} | Date: ${m.created_at} | Description: ${m.description} | Value: ${m.amount} | Type: ${m.type}`);
  }
}

run();
