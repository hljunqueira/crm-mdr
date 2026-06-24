import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const gaivotaUnitId = 'cf7efbfd-dd63-4618-9d9b-0887a1ec5032';
  const customerId = '2cc52c17-1fb1-489a-ac3a-47d1d1ea5ca8';

  console.log('Updating Tainara Costa unit_id to Gaivota...');
  const { data, error } = await supabase
    .from('customers')
    .update({ unit_id: gaivotaUnitId })
    .eq('id', customerId)
    .select();

  if (error) {
    console.error('Failed to update:', error);
    return;
  }

  console.log('Update successful:', data);
}

run();
