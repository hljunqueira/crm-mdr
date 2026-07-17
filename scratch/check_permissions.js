import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: perms } = await supabase.from('user_permissions').select('*').eq('profile_id', '56b8c288-2702-4b9c-9819-f8b77f18848a');
  console.log('Permissions for Terminal Arroio:', perms);
}

run();
