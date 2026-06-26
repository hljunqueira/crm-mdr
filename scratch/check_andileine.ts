import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Searching for customers with "Andileine"...');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%Andileine%');

  if (custErr) {
    console.error('Error fetching customers:', custErr);
    return;
  }

  console.log('Found customers:', customers);

  for (const customer of customers || []) {
    console.log(`\n=== Customer: ${customer.name} (${customer.id}) ===`);
    console.log(`Phone: "${customer.phone}"`);
    console.log(`CPF: "${customer.cpf}"`);
    console.log(`Approved: ${customer.approved_for_purchase}`);
    console.log(`Status: ${customer.status}`);
  }
}

run();
