import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching single device to inspect columns...');
  const { data: devices, error } = await supabase
    .from('devices')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching device:', error);
    return;
  }

  console.log('Columns in devices table:');
  if (devices && devices.length > 0) {
    console.log(Object.keys(devices[0]));
    console.log('Sample data:', devices[0]);
  } else {
    console.log('No devices found in DB to inspect.');
    // Let's print out the error if we try to insert with a random column
    const { error: insErr } = await supabase
      .from('devices')
      .insert([{ random_nonexistent_col_name: 1 }]);
    console.log('Postgres error message contains columns info:', insErr);
  }
}

run();
