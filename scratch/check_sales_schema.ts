import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  if (!customers || customers.length === 0) {
    console.error('No customers found in DB to use for schema checking.');
    return;
  }
  const customerId = customers[0].id;

  const { data, error } = await supabase
    .from('sales')
    .insert([{
      customer_id: customerId,
      device_model_manual: 'TEMP_TEST',
      total_value: 0,
      down_payment: 0,
      installments_count: 1,
      sale_date: new Date().toISOString().split('T')[0],
      status: 'cancelled'
    }])
    .select();

  if (error) {
    console.error('Error inserting dummy sale:', error);
  } else {
    console.log('Staged columns in sales:', Object.keys(data[0]));
    // Clean up
    await supabase.from('sales').delete().eq('id', data[0].id);
  }
}

check();
