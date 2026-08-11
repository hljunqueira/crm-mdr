import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Investigando venda do Gabriel Dos Santos Ferreira...');

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .ilike('name', '%GABRIEL DOS SANTOS%')
    .maybeSingle();

  if (!customer) {
    console.log('Cliente Gabriel não localizado.');
    return;
  }

  console.log('Cliente encontrado:', customer);

  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('customer_id', customer.id);

  console.log('Vendas do Gabriel:', JSON.stringify(sales, null, 2));
}

run();
