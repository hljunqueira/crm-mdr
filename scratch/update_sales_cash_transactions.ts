import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function updateSalesCashTransactions() {
  console.log('=== UPDATING CASH TRANSACTIONS FOR SALES TO LOJA ===');

  const { data: txs, error } = await supabase
    .from('cash_transactions')
    .select('id, sale_id, cashier_type')
    .eq('category', 'sale');

  if (error) {
    console.error('Error fetching cash transactions:', error);
    return;
  }

  console.log(`Found ${txs?.length || 0} sales cash transactions.`);

  let updatedCount = 0;
  for (const tx of (txs || [])) {
    if (tx.cashier_type !== 'LOJA') {
      const { error: updateErr } = await supabase
        .from('cash_transactions')
        .update({ cashier_type: 'LOJA' })
        .eq('id', tx.id);
      
      if (updateErr) {
        console.error(`Error updating tx ${tx.id}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} cash transactions to cashier_type = 'LOJA'.`);
}

updateSalesCashTransactions();
