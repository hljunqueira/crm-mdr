import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Search for customer with CPF formatted or clean
  console.log('Searching customers with unformatted CPF...');
  const { data: customersClean, error: error1 } = await supabase
    .from('customers')
    .select('*')
    .or('cpf.eq.48910810823,name.ilike.%adao%');
  console.log('Clean CPF search result:', JSON.stringify(customersClean, null, 2));

  // 2. Search all sales for IMEI 355084696613939 or model E20 or E7 Power
  console.log('Searching sales with IMEI or device text...');
  const { data: salesByImei, error: error2 } = await supabase
    .from('sales')
    .select('*, customers(*)')
    .or('imei_manual.ilike.%355084696613939%,device_model_manual.ilike.%moto%');
  console.log('Sales with IMEI or device text result:', JSON.stringify(salesByImei, null, 2));

  // 3. Search devices table for this IMEI or serials
  console.log('Searching devices table...');
  const { data: devicesByImei, error: error3 } = await supabase
    .from('devices')
    .select('*')
    .or('imei.eq.355084696613939,serial_number.eq.355084696613939');
  console.log('Devices search result:', JSON.stringify(devicesByImei, null, 2));
}

main();
