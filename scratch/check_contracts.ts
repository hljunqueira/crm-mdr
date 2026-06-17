import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying for customers with "Nunes", "Barros" or "Adão/Adao"...');
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .or('name.ilike.%Nunes%,name.ilike.%Barros%,name.ilike.%Adão%,name.ilike.%Adao%');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  console.log(`Found ${customers.length} customer(s):`);
  console.log(JSON.stringify(customers, null, 2));

  for (const customer of customers) {
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*, devices(*)')
      .eq('customer_id', customer.id);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      continue;
    }

    console.log(`\nCustomer: ${customer.name} (ID: ${customer.id})`);
    console.log(`Sales count: ${sales.length}`);
    if (sales.length > 0) {
      console.log(JSON.stringify(sales, null, 2));
    }
  }
}

main();
