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
    .select('*, customers(name), stores(name)')
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

  console.log(`Found ${sales.length} crediario sales total.`);
  console.log('--- Sales status: ---');

  const missingList = [];

  sales.forEach(s => {
    const hasLock = lockSaleIds.has(s.id);
    console.log(`Sale ID: ${s.id.split('-')[0]} | Store: ${s.stores?.name || s.store_id} | Customer: ${s.customers?.name} | Device: ${s.device_model_manual} | Status: ${s.status} | Has Lock Record: ${hasLock ? 'YES' : 'NO'}`);
    
    if (!hasLock && s.status !== 'cancelled') {
      missingList.push(s);
    }
  });

  console.log(`\nFound ${missingList.length} active/completed crediario sales with MISSING device locks.`);
}

run();
