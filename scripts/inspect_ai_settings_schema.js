import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const CHANNEL_ID = '4d7b1b94-8475-4b43-9478-ddc645dddbdd';

async function run() {
  console.log('Testing insert with a valid channel_id in ai_settings...');
  const dummySettings = {
    channel_id: CHANNEL_ID,
    enabled: false,
    provider: 'groq',
    api_key: 'test_key',
    system_prompt: 'test prompt',
    max_tokens: 500
  };
  
  const { data: insData, error: insError } = await supabase
    .from('ai_settings')
    .insert([dummySettings])
    .select();
    
  if (insError) {
    console.error('Insert error:', insError);
  } else {
    console.log('Insert success! Created row:', insData);
    console.log('Columns in ai_settings table:', Object.keys(insData[0]));
    // Clean it up
    await supabase.from('ai_settings').delete().eq('id', insData[0].id);
    console.log('Cleaned up the test row.');
  }
}

run();
