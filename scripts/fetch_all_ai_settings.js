import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all rows from ai_settings...');
  const { data, error } = await supabase
    .from('ai_settings')
    .select('*');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total settings rows:', data.length);
    console.log('Rows:', data);
  }
}

run();
