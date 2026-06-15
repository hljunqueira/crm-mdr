import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearInventory() {
  console.log('Clearing foreign key references in sales and service_order_parts...');
  
  // Set device_id in sales to null
  const { error: salesErr } = await supabase
    .from('sales')
    .update({ device_id: null })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (salesErr) {
    console.warn('Failed to clear device_id in sales:', salesErr.message);
  }

  // Set inventory_item_id in service_order_parts to null
  const { error: partsErr } = await supabase
    .from('service_order_parts')
    .update({ inventory_item_id: null })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (partsErr) {
    console.warn('Failed to clear inventory_item_id in service_order_parts:', partsErr.message);
  }

  console.log('Deleting all items from the "devices" table...');
  const { error: deleteErr } = await supabase
    .from('devices')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteErr) {
    console.error('Error deleting items from devices:', deleteErr.message);
  } else {
    console.log('All inventory items deleted successfully!');
  }
}

clearInventory().catch(console.error);
