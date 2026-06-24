import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function fix() {
  const { data, error } = await supabase
    .from('devices')
    .update({ status: 'available' })
    .eq('id', '49e325b2-f0cb-46c5-b1c9-f9b80f628b6d')
    .select();

  console.log('--- FIXED DEVICE ---');
  console.log(data || error);
}

fix();
