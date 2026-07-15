import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('--- iPhone 16 Sale & Device details ---');
  // Sale: 7c617814-e64d-4770-8341-2cf45a3cdf36
  const { data: sale16 } = await supabase.from('sales').select('*').eq('id', '7c617814-e64d-4770-8341-2cf45a3cdf36').single();
  console.log('Sale 16:', sale16);
  if (sale16.device_id) {
    const { data: dev16 } = await supabase.from('devices').select('*').eq('id', sale16.device_id).single();
    console.log('Device 16:', dev16);
  }

  console.log('\n--- iPhone 13 Sale & Device details ---');
  // Sale: 203cff9c-d898-45b7-842c-389aecf3c009
  const { data: sale13 } = await supabase.from('sales').select('*').eq('id', '203cff9c-d898-45b7-842c-389aecf3c009').single();
  console.log('Sale 13:', sale13);
  if (sale13.device_id) {
    const { data: dev13 } = await supabase.from('devices').select('*').eq('id', sale13.device_id).single();
    console.log('Device 13:', dev13);
  }
}

run().catch(console.error);
