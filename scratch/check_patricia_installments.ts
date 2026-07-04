import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, manual_category, custom_interest_rate, investment_category');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Profiles:', profiles);
}

run();
