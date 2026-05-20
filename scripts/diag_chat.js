import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('=== automation_channels ===');
  const { data: channels, error: chErr } = await supabase.from('automation_channels').select('*');
  if (chErr) console.error('Error:', chErr);
  else console.log(JSON.stringify(channels, null, 2));

  console.log('\n=== conversations (first 5) ===');
  const { data: convs, error: convErr } = await supabase.from('conversations').select('id, channel_id, contact_name').limit(5);
  if (convErr) console.error('Error:', convErr);
  else console.log(JSON.stringify(convs, null, 2));
}

run();
