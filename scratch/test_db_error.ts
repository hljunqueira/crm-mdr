import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Starting test with sale_id on transaction...');
  
  // 1. Get a store_id
  const { data: stores } = await supabase.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) {
    console.error('No stores found');
    return;
  }
  const storeId = stores[0].id;
  
  // 2. Get a profile (seller)
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) {
    console.error('No profiles found');
    return;
  }
  const profileId = profiles[0].id;

  // 3. Create a dummy sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      store_id: storeId,
      seller_id: profileId,
      total_value: 100,
      down_payment: 0,
      installments_count: 1,
      payment_type: 'vista',
      status: 'completed',
      sale_date: new Date().toISOString()
    })
    .select()
    .single();

  if (saleErr) {
    console.error('Error creating test sale:', saleErr);
    return;
  }

  console.log('Created test sale:', sale.id);

  // 4. Create a cash transaction linked directly to the sale
  const { data: tx, error: txErr } = await supabase
    .from('cash_transactions')
    .insert({
      unit_id: storeId,
      type: 'inflow',
      category: 'sale',
      amount: 100,
      payment_method: 'money',
      sale_id: sale.id,
      created_by: profileId
    })
    .select()
    .single();

  if (txErr) {
    console.error('Error creating cash transaction:', txErr);
    // Cleanup
    await supabase.from('sales').delete().eq('id', sale.id);
    return;
  }

  console.log('Created test cash transaction:', tx.id);

  // 5. Try to delete the sale and observe error
  console.log('Attempting to delete sale...');
  const { error: delErr } = await supabase
    .from('sales')
    .delete()
    .eq('id', sale.id);

  if (delErr) {
    console.log('Delete failed! Error details:', delErr);
  } else {
    console.log('Delete succeeded! The foreign key cascade/restrict worked.');
  }

  // Cleanup
  console.log('Cleaning up...');
  await supabase.from('cash_transactions').delete().eq('id', tx.id);
  await supabase.from('sales').delete().eq('id', sale.id);
}

run();
