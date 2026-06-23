import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const gaivotaUnit = 'cf7efbfd-dd63-4618-9d9b-0887a1ec5032';
  const arroioUnit = 'b2b1f71d-0471-49a1-b151-865ccc3cd627';

  console.log('Query for Gaivota:');
  const { data: dataGaivota, error: errorGaivota } = await supabase
    .from('outsourced_orders')
    .select('*, service_orders!inner(*, customers(name, phone))')
    .eq('service_orders.unit_id', gaivotaUnit);
  console.log('Gaivota results:', dataGaivota?.length, 'Error:', errorGaivota?.message);

  console.log('Query for Arroio:');
  const { data: dataArroio, error: errorArroio } = await supabase
    .from('outsourced_orders')
    .select('*, service_orders!inner(*, customers(name, phone))')
    .eq('service_orders.unit_id', arroioUnit);
  console.log('Arroio results:', dataArroio?.length, 'Error:', errorArroio?.message);
}

run();
