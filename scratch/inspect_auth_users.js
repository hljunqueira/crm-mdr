import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all authenticated users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing auth users:', error);
    return;
  }

  console.log('Auth Users found:', users.length);
  users.forEach(u => {
    console.log(`- ID: ${u.id}\n  Email: ${u.email}\n  Created At: ${u.created_at}\n  Last Sign In: ${u.last_sign_in_at}\n  Meta role: ${u.user_metadata?.role}\n`);
  });
}

run();
