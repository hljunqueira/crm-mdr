import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const gaivotaUnitId = 'cf7efbfd-dd63-4618-9d9b-0887a1ec5032';
  
  const { data: sales } = await supabase.from('sales').select('*, customers(name)').eq('store_id', gaivotaUnitId);
  console.log('Gaivota sales:', sales?.length);
  console.log('Sales details:', sales);
  
  const { data: serviceOrders } = await supabase.from('service_orders').select('*, customers(name)').eq('unit_id', gaivotaUnitId);
  console.log('Gaivota OS:', serviceOrders?.length);
  console.log('OS details:', serviceOrders);
}

run();
