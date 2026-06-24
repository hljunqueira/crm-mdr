import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .ilike('model', '%assistencia%');

  console.log('--- DEVICES MATCHING ASSISTENCIA ---');
  console.log(data);
}

check();
