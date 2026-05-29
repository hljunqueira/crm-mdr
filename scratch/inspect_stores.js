import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all stores (units) from database...');
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*');

  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }

  console.log('Stores found in database:', stores.length);
  stores.forEach(s => {
    console.log(`- ID: ${s.id}\n  Name: ${s.name}\n  CNPJ: ${s.cnpj}\n  Phone: ${s.phone}\n`);
  });
}

run();
