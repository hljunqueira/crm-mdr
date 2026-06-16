import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Querying stores...');
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*');

  if (error) {
    console.error('Error fetching stores:', error);
  } else {
    console.log('Stores Count:', stores?.length);
    console.log('Stores Data:', JSON.stringify(stores, null, 2));
  }
}

test();



