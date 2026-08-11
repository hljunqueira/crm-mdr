import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSalesCols() {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }

  console.log('Sample sale object keys:', Object.keys(sales?.[0] || {}));
  console.log('Sample sales down_payment / entry values:');
  sales?.forEach(s => {
    console.log(`Sale ID: ${s.id} | down_payment: ${s.down_payment} | payment_type: ${s.payment_type} | entry_value: ${(s as any).entry_value}`);
  });
}

inspectSalesCols();
