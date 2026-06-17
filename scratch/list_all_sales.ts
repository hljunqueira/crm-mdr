import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying the last 50 sales...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*, customers(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    return;
  }

  console.log(`Found ${sales.length} sales in total.`);
  for (const s of sales) {
    console.log(`Sale ID: ${s.id} | Date: ${s.sale_date} | Customer: ${s.customers?.name} (CPF: ${s.customers?.cpf}) | Model: ${s.device_model_manual} | Total: ${s.total_value}`);
  }
}

main();
