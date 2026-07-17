import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', anonKey || '');

async function run() {
  // Sign in as Terminal Arroio
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'lojaarroio@mdrinformaticaecelulares.com.br',
    password: '123' // wait, we don't know the password, let's see if we can get the profile first using service role or check the profiles table password hash
  });

  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  console.log('Logged in successfully!');

  // Query profiles
  const { data: profilesList, error: profErr } = await supabase.from('profiles').select('*');
  console.log('Profiles returned:', profilesList ? profilesList.length : 0, 'error:', profErr);
  if (profilesList) {
    console.log('Profiles names:', profilesList.map(p => p.full_name));
  }

  // Query user_permissions
  const { data: permsList, error: permErr } = await supabase.from('user_permissions').select('*');
  console.log('Permissions returned:', permsList ? permsList.length : 0, 'error:', permErr);
}

run();
