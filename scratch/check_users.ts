import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- STORES (UNITS) ---');
  const { data: stores } = await supabase.from('stores').select('*');
  console.log(stores);

  console.log('\n--- PROFILES ---');
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, store_id');
  console.log(profiles);

  console.log('\n--- ACTIVE SHIFTS ---');
  const { data: shifts } = await supabase.from('cash_shifts').select('*');
  console.log(shifts);
}

run();
