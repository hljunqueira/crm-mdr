import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all rows from automation_channels...');
  const { data: channels, error: channelsErr } = await supabase
    .from('automation_channels')
    .select('*');

  if (channelsErr) {
    console.error('Error fetching channels:', channelsErr);
  } else {
    console.log('Channels found:', channels.length);
    channels.forEach(c => {
      console.log(`- ID: ${c.id}, Name: ${c.name}, Provider: ${c.provider}, Instance: ${c.instance_name}`);
    });
  }

  console.log('\nFetching all rows from ai_settings...');
  const { data: aiSettings, error: aiErr } = await supabase
    .from('ai_settings')
    .select('*');

  if (aiErr) {
    console.error('Error fetching ai_settings:', aiErr);
  } else {
    console.log('AI Settings rows found:', aiSettings.length);
    aiSettings.forEach(s => {
      console.log(`- ID: ${s.id}, Channel ID: ${s.channel_id}, Enabled: ${s.enabled}, Provider: ${s.provider}`);
    });
  }
}

run();
