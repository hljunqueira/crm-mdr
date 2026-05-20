import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Attempting to fetch a row from devices table...');
  const { data: rowData, error: rowError } = await supabase
    .from('devices')
    .select('*')
    .limit(1);
    
  if (rowError) {
    console.error('Fetch Error:', rowError);
  } else {
    console.log('Columns in devices table:', rowData && rowData.length > 0 ? Object.keys(rowData[0]) : 'No rows found or empty table.');
  }

  // Let's try inserting a dummy item to see what errors we get
  console.log('Testing a dummy insert to see schema issues...');
  const dummyItem = {
    brand: 'Test',
    model: 'Test Model',
    cost_price: 100,
    sale_price: 150,
    condition: 'vitrine',
    status: 'available'
  };
  const { data: insData, error: insError } = await supabase
    .from('devices')
    .insert([dummyItem])
    .select();
    
  if (insError) {
    console.error('Insert Error:', insError);
  } else {
    console.log('Insert Success:', insData);
    // clean up
    if (insData && insData[0]) {
      await supabase.from('devices').delete().eq('id', insData[0].id);
      console.log('Cleaned up dummy item.');
    }
  }
}

run();
