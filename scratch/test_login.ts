import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('--- ATTEMPTING SIGNIN WITH PASSWORD ---');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@mdrinformatica.com.br',
      password: 'Admin@Mdr@2026' // The actual password from create_users.sql
    });

    if (error) {
      console.error('Sign-in failed:', error);
      return;
    }

    console.log('Sign-in successful. User ID:', data.user?.id);
    console.log('Session access_token length:', data.session?.access_token.length);

    console.log('\n--- FETCHING PROFILE ---');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else {
      console.log('Profile fetched successfully:', profileData);
    }
  } catch (err) {
    console.error('Unexpected exception:', err);
  }
}

run();
