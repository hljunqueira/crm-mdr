import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: locks, error } = await supabase.from('device_locks').select('*, devices(*), sales(*, customers(*))');
  console.log('Error:', error);
  console.log('Total device locks:', locks?.length);
  console.log('Locks details:', locks?.map(l => ({
    id: l.id,
    device_id: l.device_id,
    sale_id: l.sale_id,
    lock_type: l.lock_type,
    customer: l.sales?.customers?.name,
    payment_type: l.sales?.payment_type,
    model: l.devices?.model
  })));
}

run();
