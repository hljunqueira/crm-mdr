import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- SALES ---');
  const { data: sales } = await supabase
    .from('sales')
    .select('id, store_id, total_value, customer_id, customers(name)');
  console.log(sales);

  console.log('\n--- SERVICE ORDERS ---');
  const { data: service_orders } = await supabase
    .from('service_orders')
    .select('id, unit_id, os_number, customer_id, customers(name)');
  console.log(service_orders);
}

run();
