import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  // Get all sales with payment_type = 'crediario'
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .eq('payment_type', 'crediario');

  if (salesError) {
    console.error('Error fetching sales:', salesError);
    return;
  }

  // Get all device locks
  const { data: locks, error: locksError } = await supabase
    .from('device_locks')
    .select('id, sale_id');

  if (locksError) {
    console.error('Error fetching locks:', locksError);
    return;
  }

  const lockSaleIds = new Set(locks.map(l => l.sale_id));
  console.log(`Checking ${sales.length} crediario sales...`);

  let count = 0;
  for (const s of sales) {
    const hasLock = lockSaleIds.has(s.id);
    if (!hasLock && s.status !== 'cancelled') {
      const isIphone = (s.device_model_manual || '').toLowerCase().includes('iphone') || 
                       (s.device_model_manual || '').toLowerCase().includes('apple');
      const lockType = isIphone ? 'icloud' : 'android';

      console.log(`Inserting missing virtual lock for: ${s.device_model_manual} (${s.id.split('-')[0]})`);
      const { error } = await supabase
        .from('device_locks')
        .insert({
          device_id: null,
          sale_id: s.id,
          lock_type: lockType,
          icloud_locked: false,
          mdm_locked: false
        });

      if (error) {
        console.error('Failed to insert lock:', error);
      } else {
        count++;
      }
    }
  }

  console.log(`Successfully migrated ${count} missing device locks.`);
}

run();
