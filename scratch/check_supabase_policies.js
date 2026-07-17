import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data, error } = await supabase.rpc('get_policies'); // If RPC exists, or query directly via SQL
  // Wait, if get_policies RPC doesn't exist, we can use a query. But via API we cannot run arbitrary SQL unless we use pg_meta or a function.
  // Let's see if we can do a query using pg_policies by creating a temp function or if we can just test queries as a non-admin.
  
  // Let's test what an anonymous/authenticated user sees for user_permissions
  console.log('Testing query on user_permissions...');
  const { data: perms, error: permsErr } = await supabase.from('user_permissions').select('*');
  console.log('user_permissions count:', perms ? perms.length : 0, 'Error:', permsErr);
  
  console.log('Testing query on profiles...');
  const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('*');
  console.log('profiles count:', profiles ? profiles.length : 0, 'Error:', profilesErr);
}

run();
