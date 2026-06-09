import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- FETCHING STORES ---');
  const { data: stores, error: storesError } = await supabase.from('stores').select('*');
  if (storesError) {
    console.error('Error fetching stores:', storesError);
  } else {
    console.log('Stores in DB:', stores);
  }

  console.log('\n--- FETCHING DEVICES (LIMIT 10) ---');
  const { data: devices, error: devicesError } = await supabase.from('devices').select('id, model, store_id, stock_quantity').limit(10);
  if (devicesError) {
    console.error('Error fetching devices:', devicesError);
  } else {
    console.log('Devices:', devices);
  }
}

run();
