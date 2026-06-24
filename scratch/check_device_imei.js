import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const imei = '868717075668921';
  const { data: dev, error } = await supabase.from('devices').select('*').eq('imei', imei).maybeSingle();
  console.log('Error:', error);
  console.log('Device in table:', dev);
  
  // Let's also check Tainara's sale device_id
  const { data: sale } = await supabase.from('sales').select('*').eq('id', '1f7a05d2-244a-493a-9b21-8df2c33ee639').single();
  console.log('Tainara Sale device_id:', sale?.device_id);
  if (sale?.device_id) {
    const { data: devById } = await supabase.from('devices').select('*').eq('id', sale.device_id).maybeSingle();
    console.log('Device by ID:', devById);
  }
}

run();
