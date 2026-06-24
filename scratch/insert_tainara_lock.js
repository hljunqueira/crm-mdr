import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const saleId = '1f7a05d2-244a-493a-9b21-8df2c33ee639';
  const deviceId = 'ddf14a30-d8c3-4068-b14f-d5b931216a11';
  
  const { data: existing } = await supabase
    .from('device_locks')
    .select('id')
    .eq('sale_id', saleId)
    .maybeSingle();

  if (existing) {
    console.log('Device lock already exists:', existing);
    return;
  }

  console.log('Inserting device lock for Tainara Costa...');
  const { data, error } = await supabase
    .from('device_locks')
    .insert({
      device_id: deviceId,
      sale_id: saleId,
      lock_type: 'android',
      icloud_locked: false,
      mdm_locked: false
    })
    .select();

  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Inserted lock successfully:', data);
  }
}

run();
