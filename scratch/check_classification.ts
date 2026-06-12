import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Let's inspect check constraints for table 'customers'
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'customers' });
  if (error) {
    // Attempt to insert a customer with classification 'A_VISTA'
    const { data: insData, error: insError } = await supabase
      .from('customers')
      .insert([{
        name: 'TESTE CLASSIF A_VISTA',
        phone: '11999999999',
        classification: 'A_VISTA'
      }])
      .select();
      
    if (insError) {
      console.error('Failed to insert with A_VISTA classification:', insError);
    } else {
      console.log('Successfully inserted with A_VISTA classification:', insData);
      // clean up
      await supabase.from('customers').delete().eq('id', insData[0].id);
    }
  } else {
    console.log('RPC info:', data);
  }
}

check();
