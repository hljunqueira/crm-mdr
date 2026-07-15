import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all profiles with role investor or name Jean...');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role');
  
  console.log('All Profiles:', profiles);

  // Fetch wallets
  const { data: wallets } = await supabase
    .from('wallets')
    .select('*');
  console.log('\nAll Wallets:', wallets);
}

run().catch(console.error);
