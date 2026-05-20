import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Testing automation_channels table...');
  const { data, error } = await supabase
    .from('automation_channels')
    .insert([{
      name: 'Test Channel',
      type: 'whatsapp',
      instance_name: 'test_instance_name_123',
      status: 'connecting'
    }])
    .select();

  if (error) {
    console.error('Error inserting into automation_channels:', error);
  } else {
    console.log('Success! Columns in automation_channels:', Object.keys(data[0]));
    console.log('Row data:', data[0]);
    // Clean up
    await supabase.from('automation_channels').delete().eq('id', data[0].id);
    console.log('Cleaned up test row.');
  }
}

run();
