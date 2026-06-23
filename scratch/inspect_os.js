import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching outsourced orders and service orders...');
  const { data: outs, error: outsError } = await supabase
    .from('outsourced_orders')
    .select('*, service_orders(*, customers(name))');

  if (outsError) {
    console.error('Error:', outsError);
    return;
  }

  console.log('Outsourced orders found:', outs?.length);
  outs?.forEach(o => {
    console.log(`- ID: ${o.id}`);
    console.log(`  Partner Shop: ${o.partner_shop_name}`);
    console.log(`  OS ID: ${o.os_id}`);
    console.log(`  OS Number: ${o.service_orders?.os_number}`);
    console.log(`  OS Unit ID: ${o.service_orders?.unit_id}`);
    console.log(`  Customer: ${o.service_orders?.customers?.name}`);
  });
}

run();
