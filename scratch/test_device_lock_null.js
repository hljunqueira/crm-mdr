import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  // Find a sale that has no device lock
  const { data: sales } = await supabase.from('sales').select('id, payment_type').eq('payment_type', 'crediario');
  const { data: locks } = await supabase.from('device_locks').select('sale_id');
  const lockSaleIds = new Set(locks?.map(l => l.sale_id));
  
  const saleWithoutLock = sales?.find(s => !lockSaleIds.has(s.id));
  console.log('Real sale without lock:', saleWithoutLock);
  
  if (!saleWithoutLock) {
    console.log('No sale found without lock.');
    return;
  }

  // Insert a test device lock with device_id: null
  const { data, error } = await supabase
    .from('device_locks')
    .insert({
      sale_id: saleWithoutLock.id,
      device_id: null,
      lock_type: 'android',
      icloud_locked: false,
      mdm_locked: false
    })
    .select();

  console.log('Insert test result:', { data, error });
  if (data?.[0]?.id) {
    await supabase.from('device_locks').delete().eq('id', data[0].id);
    console.log('Deleted test lock.');
  }
}

run();
