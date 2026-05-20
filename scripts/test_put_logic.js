import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const CHANNEL_ID = '4d7b1b94-8475-4b43-9478-ddc645dddbdd';

async function run() {
  console.log('Testing the exact PUT route logic for channel ID:', CHANNEL_ID);
  
  const enabled = true;
  const provider = 'groq';
  const api_key = process.env.GROQ_API_KEY || 'gsk_placeholder_key';
  const system_prompt = 'Você é o atendente virtual da MDR';
  const max_tokens = 500;

  // 1. Verify if exists
  const { data: existing, error: existError } = await supabase
    .from('ai_settings')
    .select('id')
    .eq('channel_id', CHANNEL_ID)
    .maybeSingle();

  if (existError) {
    console.error('Error finding existing settings:', existError);
    return;
  }
  
  console.log('Existing settings:', existing);

  const settingsData = {
    channel_id: CHANNEL_ID,
    enabled: enabled ?? false,
    provider: provider || 'groq',
    system_prompt: system_prompt || undefined,
    max_tokens: max_tokens || 500,
    updated_at: new Date().toISOString()
  };

  if (api_key && !api_key.includes('...')) {
    settingsData.api_key = api_key;
  }

  let result;
  if (existing) {
    console.log('Updating existing settings...');
    result = await supabase
      .from('ai_settings')
      .update(settingsData)
      .eq('channel_id', CHANNEL_ID)
      .select()
      .single();
  } else {
    console.log('Inserting new settings...');
    result = await supabase
      .from('ai_settings')
      .insert([settingsData])
      .select()
      .single();
  }

  if (result.error) {
    console.error('Database Error during write:', result.error);
  } else {
    console.log('Write success! Result data:', result.data);
  }
}

run();
