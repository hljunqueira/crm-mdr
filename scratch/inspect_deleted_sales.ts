import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data: txs } = await supabase.from('cash_transactions').select('id, sale_id');
  const { data: sales } = await supabase.from('sales').select('id');
  
  const saleIds = new Set(sales?.map(s => s.id) || []);
  const orphans = txs?.filter(t => t.sale_id && !saleIds.has(t.sale_id)) || [];
  
  console.log('Orphaned cash transactions count:', orphans.length);
  if (orphans.length > 0) {
    console.log('Orphaned cash transactions:', orphans);
  }
}
run();
