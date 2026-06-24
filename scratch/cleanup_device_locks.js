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
      device:devices(id, model, brand, imei, category),
      sale:sales(
        id,
        total_value,
        payment_type,
        device_model_manual,
        imei_manual
      )
    `);

  if (error) {
    console.error('Error fetching device locks:', error);
    return;
  }

  console.log(`Checking ${locks.length} device locks...`);
  const toDelete = [];

  for (const lock of locks) {
    if (!lock.sale) {
      console.log(`Lock ${lock.id}: No associated sale. Mark for deletion.`);
      toDelete.push(lock.id);
      continue;
    }

    const sale = lock.sale;
    if (sale.payment_type !== 'crediario') {
      console.log(`Lock ${lock.id}: Sale payment type is not crediario (${sale.payment_type}). Mark for deletion.`);
      toDelete.push(lock.id);
      continue;
    }

    const imeiStr = (sale.imei_manual || '').trim();
    const hasImei = imeiStr !== '' && imeiStr.toUpperCase() !== 'N/A' && imeiStr !== '0000000';

    if (!hasImei) {
      console.log(`Lock ${lock.id}: Sale has no valid IMEI (${sale.imei_manual}). Mark for deletion.`);
      toDelete.push(lock.id);
      continue;
    }

    if (lock.device_id) {
      if (lock.device?.category !== 'smartphone') {
        console.log(`Lock ${lock.id}: Device category is not smartphone (${lock.device?.category}). Mark for deletion.`);
        toDelete.push(lock.id);
      }
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} invalid device locks...`);
    const { error: delError } = await supabase
      .from('device_locks')
      .delete()
      .in('id', toDelete);

    if (delError) {
      console.error('Error deleting locks:', delError);
    } else {
      console.log('Successfully deleted invalid device locks!');
    }
  } else {
    console.log('No invalid device locks found.');
  }
}

run();
