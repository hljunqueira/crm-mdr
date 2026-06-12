import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error('Error selecting from customers:', error);
  } else {
    console.log('Customer columns:', data.length > 0 ? Object.keys(data[0]) : 'No data, but table exists');
    console.log('Sample customer row:', data[0]);
  }
}

check();
