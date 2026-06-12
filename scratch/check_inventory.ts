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
  const { data, error } = await supabase.from('devices').select('id, model, brand, status, stock_quantity, category');
  if (error) {
    console.error('Error selecting from devices:', error);
  } else {
    console.log('Total devices in DB:', data.length);
    console.log('Devices:', data);
  }
}

check();
