import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const deviceId = 'a46fa223-e510-4187-b7b9-4c486da9ed82';

  console.log(`Checking device ID ${deviceId}...`);
  const { data: device, error: fetchError } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .single();

  if (fetchError || !device) {
    console.error('Error fetching device:', fetchError);
    return;
  }

  console.log('Current device state:', device);

  if (device.stock_quantity > 0 && device.status === 'sold') {
    console.log(`Device has stock_quantity = ${device.stock_quantity} but status = 'sold'. Changing status to 'available'...`);
    
    const { data: updated, error: updateError } = await supabase
      .from('devices')
      .update({ status: 'available' })
      .eq('id', deviceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating status:', updateError);
    } else {
      console.log('Successfully updated device state:', updated);
    }
  } else {
    console.log('Device status is already consistent with stock.');
  }
}

main();
