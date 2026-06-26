import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .or('phone.ilike.%991013293%,phone.ilike.%91013293%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles found with that phone:', profiles);
  }
}

run();
