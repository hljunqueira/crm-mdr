import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Deactivating show_on_landing for all devices...');
  const { data, error } = await supabase
    .from('devices')
    .update({ show_on_landing: false })
    .neq('id', '00000000-0000-0000-0000-000000000000') // select all
    .select('id, model, show_on_landing');

  if (error) {
    console.error('Error updating devices:', error);
  } else {
    console.log(`Successfully deactivated show_on_landing for ${data?.length || 0} devices.`);
  }
}

run();
