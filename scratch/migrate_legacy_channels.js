import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching legacy channels...');
  const { data: legacy, error: fetchErr } = await supabase
    .from('channels')
    .select('*');

  if (fetchErr) {
    console.error('Error fetching legacy channels:', fetchErr);
    return;
  }

  console.log(`Found ${legacy.length} legacy channels. Migrating to automation_channels...`);

  for (const c of legacy) {
    const instanceName = c.instance_name || c.name.toLowerCase().replace(/\s+/g, '_');
    
    console.log(`Migrating channel: "${c.name}" -> instance_name: "${instanceName}"`);
    
    const row = {
      id: c.id,
      name: c.name,
      type: c.type || 'whatsapp',
      instance_name: instanceName,
      status: c.status || 'disconnected',
      unit_id: c.unit_id || null,
      updated_at: new Date().toISOString()
    };

    const { data, error: insertErr } = await supabase
      .from('automation_channels')
      .upsert(row)
      .select();

    if (insertErr) {
      console.error(`Error migrating "${c.name}":`, insertErr);
    } else {
      console.log(`Successfully migrated "${c.name}". New Row:`, data[0]);
    }
  }

  console.log('Migration finished!');
}

run();
