import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching conversations from Supabase...');
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(30);

  if (error) {
    console.error('Error fetching conversations:', error);
  } else {
    console.log('Total conversations found:', data.length);
    data.forEach((c, idx) => {
      console.log(`[${idx + 1}] ID: ${c.id}`);
      console.log(`    Channel ID: ${c.channel_id}`);
      console.log(`    Contact Name: "${c.contact_name}"`);
      console.log(`    Contact Phone: "${c.contact_phone}"`);
      console.log(`    Last Message: "${c.last_message}"`);
      console.log(`    Unread Count: ${c.unread_count}`);
      console.log('--------------------------------------------------');
    });
  }
}

run();
