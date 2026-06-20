import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const saleId = '0a9d47c2-64b9-4708-b7de-5c13bdd942d2';
  const deviceId = 'e3d3bf68-0514-4211-8a14-93f54273989c'; // celular moto e7

  console.log(`Checking if device lock already exists for sale ${saleId} and device ${deviceId}...`);
  const { data: existing, error: checkError } = await supabase
    .from('device_locks')
    .select('*')
    .eq('sale_id', saleId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking:', checkError);
    return;
  }

  if (existing) {
    console.log('Device lock already exists:', existing);
    return;
  }

  console.log('Inserting device lock for celular moto e7...');
  const { data: inserted, error: insertError } = await supabase
    .from('device_locks')
    .insert({
      sale_id: saleId,
      device_id: deviceId,
      lock_type: 'android',
      icloud_locked: false,
      mdm_locked: false
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting:', insertError);
  } else {
    console.log('Successfully inserted device lock:', inserted);
  }
}

main();
