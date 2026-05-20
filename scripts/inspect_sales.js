import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching sales from database...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*, customers(name)');

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    return;
  }

  console.log('Total sales found:', sales.length);
  if (sales.length > 0) {
    console.log('Sales details:');
    sales.forEach(sale => {
      console.log(`- ID: ${sale.id}`);
      console.log(`  Customer: ${sale.customers?.name || 'Unknown'} (${sale.customer_id})`);
      console.log(`  Total Value: ${sale.total_value}`);
      console.log(`  Installments Count: ${sale.installments_count}`);
      console.log(`  Store ID: ${sale.store_id}`);
      console.log(`  Created At: ${sale.created_at}`);
      console.log('-------------------');
    });
  }
}

run();
