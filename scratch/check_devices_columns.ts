import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('devices').select('*').limit(1);
  if (error) {
    console.error('Error fetching devices:', error);
  } else {
    console.log('Devices columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data found in devices');
  }
}

check();
