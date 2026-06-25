import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's run a query to inspect constraints on cash_transactions using a system catalog query.
  // Wait, we don't have direct SQL execution, but we can query using an RPC if there's a generic one, or we can check the error by trying to delete a real sale that has installment payments.
  // Let's query recent cash_transactions to see if there are any linked to installments.
  const { data, error } = await supabase
    .from('cash_transactions')
    .select('id, installment_id, sale_id')
    .not('installment_id', 'is', null)
    .limit(5);

  console.log('Cash transactions with installment_id:', data);
  if (error) console.error(error);
}

run();
