import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Querying info about ai_settings table...');
  
  // Let's try to query all rows from ai_settings
  const { data, error } = await supabase
    .from('ai_settings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying ai_settings:', error);
  } else {
    console.log('Query success! Number of rows found:', data.length);
    if (data.length > 0) {
      console.log('Columns in ai_settings:', Object.keys(data[0]));
      console.log('Sample row:', data[0]);
    } else {
      console.log('No rows found in ai_settings, but the table exists!');
      // Let's try to do a dummy insert to see columns
      const dummySettings = {
        channel_id: '9d8c4c5a-4ef0-4600-b0f5-e227108293fd', // dummy UUID or actual store_id
        enabled: false,
        provider: 'groq',
        api_key: 'test',
        system_prompt: 'test',
        max_tokens: 500
      };
      
      const { data: insData, error: insError } = await supabase
        .from('ai_settings')
        .insert([dummySettings])
        .select();
        
      if (insError) {
        console.error('Insert error to find columns:', insError);
      } else {
        console.log('Insert success! Columns:', Object.keys(insData[0]));
        // cleanup
        await supabase.from('ai_settings').delete().eq('id', insData[0].id);
      }
    }
  }
}

run();
