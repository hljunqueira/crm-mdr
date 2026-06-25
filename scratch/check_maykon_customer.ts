import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's search for customers or profiles matching Maykon
  const { data: customers, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%maykon%');

  if (cErr) {
    console.error('Error fetching customers:', cErr);
  } else {
    console.log(`Found ${customers?.length || 0} customers with 'maykon':`);
    customers?.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name}`));
  }

  // Let's also check sales
  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select('*, customer:customers(name)')
    .limit(10);
    
  if (sErr) {
    console.error('Error fetching sales:', sErr);
  } else {
    console.log('Recent sales:');
    sales?.forEach(s => console.log(`ID: ${s.id} | Customer: ${s.customer?.name} | Created: ${s.created_at}`));
  }
}

run();
