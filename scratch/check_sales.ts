import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const deviceId = 'ddf14a30-d8c3-4068-b14f-d5b931216a11';
  const { data: device } = await supabase
    .from('devices')
    .select('*, stores(name)')
    .eq('id', deviceId)
    .single();

  console.log('Device Store ID:', device?.store_id, 'Store Name:', device?.stores?.name);
}

run();
