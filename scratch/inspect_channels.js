import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Querying Supabase database tables...');
  
  console.log('1. Querying automation_channels table:');
  const { data: autoChannels, error: err1 } = await supabase
    .from('automation_channels')
    .select('*');

  if (err1) {
    console.error('Error fetching automation_channels:', err1);
  } else {
    console.log(`Found ${autoChannels.length} records in automation_channels:`);
    autoChannels.forEach(c => {
      console.log(`- ID: ${c.id}\n  Name: ${c.name}\n  Type: ${c.type}\n  Instance Name: ${c.instance_name}\n  Status: ${c.status}\n  Store/Unit ID: ${c.store_id || c.unit_id}`);
    });
  }

  console.log('\n2. Querying legacy channels table:');
  const { data: legacyChannels, error: err2 } = await supabase
    .from('channels')
    .select('*');

  if (err2) {
    console.error('Error fetching legacy channels:', err2);
  } else {
    console.log(`Found ${legacyChannels.length} records in legacy channels:`);
    legacyChannels.forEach(c => {
      console.log(`- ID: ${c.id}\n  Name: ${c.name}\n  Type: ${c.type}\n  Instance Name: ${c.instance_name}\n  Status: ${c.status}\n  Unit ID: ${c.unit_id}`);
    });
  }
}

run();
