import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Searching for cliente balcao in DB...');
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%balc%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Cliente balcao records:', customers);
}

run();
