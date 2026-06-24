import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
  const { data: locks, error } = await supabase
    .from('device_locks')
    .select(`
      id,
      device_id,
      sale_id,
      lock_type,
      device:devices(id, model, brand, imei, category),
      sale:sales(
        id,
        total_value,
        payment_type,
        device_model_manual,
        imei_manual,
        customer:customers(name, cpf)
      )
    `);

  if (error) {
    console.error('Error fetching device locks:', error);
    return;
  }

  console.log(`Found ${locks.length} device locks:`);
  for (const lock of locks) {
    console.log({
      id: lock.id,
      device_id: lock.device_id,
      device_category: lock.device?.category,
      device_model: lock.device?.model,
      device_imei: lock.device?.imei,
      sale_payment_type: lock.sale?.payment_type,
      sale_device_model_manual: lock.sale?.device_model_manual,
      sale_imei_manual: lock.sale?.imei_manual,
      customer_name: lock.sale?.customer?.name
    });
  }
}

run();
