import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying all customers...');
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  console.log(`Found ${customers.length} customer(s):`);
  for (const c of customers) {
    console.log(`ID: ${c.id} | Name: ${c.name} | CPF: ${c.cpf} | Phone: ${c.phone}`);
  }
}

main();
